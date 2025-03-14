from fastapi import FastAPI, UploadFile, HTTPException, File
from fastapi.middleware.cors import CORSMiddleware
from byaldi import RAGMultiModalModel
import os
from schemas import Query
from model_manager import ModelManager
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv("./project.env")

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

RAG_1 = RAGMultiModalModel.from_pretrained(
    pretrained_model_name_or_path="/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/models/colqwen2-v1.0",
    index_root="/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/indexes",
    device="mps"
)

model_manager = ModelManager()

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"], 
)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    
    #save file to temp folder
    temp_path = os.path.join("/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/temp_files", file.filename)
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    
    # check if index with name TEMP exists by checking the index folder in the indexes directory
    index_path = os.path.join("/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/indexes", "gander_index")
    if not os.path.exists(index_path):
        # doc_id = file.filename.split(".")[0]
        RAG_1.index(input_path=temp_path, index_name="gander_index", metadata=[{"active": True, "name": file.filename}], store_collection_with_index=True)
        return {"message": "Index created"}
    
    # upload file to index
    # RAG = RAGMultiModalModel.from_index(index_path="gander_index", index_root="/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/indexes", device="mps")
    RAG = model_manager.get_model(index_path="gander_index", index_root="/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/indexes", device="mps")
    document_ids = RAG.model.doc_id_to_metadata
    doc_id_new = max(list(document_ids)) + 1
    RAG.add_to_index(input_item=temp_path, store_collection_with_index=True, doc_id=doc_id_new, metadata={"active": True, "name": file.filename})
    
    # delete temp file
    os.remove(temp_path)
    return {"message": "File uploaded", "document_ids": RAG.model.doc_id_to_metadata}


@app.post("/query")
async def query(query: Query):
    # RAG_2 = RAGMultiModalModel.from_index(index_path="gander_index", index_root="/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/indexes", device="mps")
    RAG_2 = model_manager.get_model(index_path="gander_index", index_root="/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/indexes", device="mps")
    results = RAG_2.search(query=query.query, filter_metadata={"active": True}, return_base64_results=True, k=3)
    
    #pass the results base64 to claude api
    
    base64_results = []
    for result in results:
        base64_results.append(result["base64"])
    
    content_array = [
        {"type": "text", "text": query.query}
    ]
    
    # Add images with proper format
    for result in results:
        content_array.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{result['base64']}",
                "detail": "high"  # Can be "low", "high", or "auto"
            }
        })
        
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant to a part 135 charter company that operates Gulfstream G550s. You will be given a question about the G550 and you will be given some reference material. If the reference material does not answer the question, just say that you do not have enough information to answer the question."
            },
            {
                "role": "user",
                "content": content_array
            }
        ]
    )
    
    return {"response": response.choices[0].message.content}

@app.get("/get_all_files")
async def get_all_files():
    # RAG_2 = RAGMultiModalModel.from_index(index_path="gander_index", index_root="/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/indexes", device="mps")
    RAG_2 = model_manager.get_model(index_path="gander_index", index_root="/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/indexes", device="mps")
    document_ids = RAG_2.model.doc_id_to_metadata
    return {"document_ids": document_ids}

@app.post("/remove_file")
async def remove_file(file_name: str):
    # set metadata active to false for the file
    # RAG_2 = RAGMultiModalModel.from_index(index_path="gander_index", index_root="/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/indexes", device="mps")
    RAG_2 = model_manager.get_model(index_path="gander_index", index_root="/Users/yahiasalman/Desktop/codingassessments/gander_assessment/Backend/indexes", device="mps")

    metadata = RAG_2.model.doc_id_to_metadata
    for doc_id in metadata.items():
        if doc_id[1]['name'] == file_name:
            doc_id[1]['active'] = False
    return {"message": RAG_2.model.doc_id_to_metadata}
    
    


