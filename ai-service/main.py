from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from classifier import classify_text, ClassificationRequest
import uvicorn

app = FastAPI(title="Privacy Policy AI Classifier")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/classify")
async def classify_policy(request: ClassificationRequest):
    try:
        if not request.text or not request.section_id:
            raise HTTPException(status_code=400, detail="Missing text or section_id")
        
        classifications = classify_text(request.text, request.section_id)
        
        return {
            "classifications": [c.dict() for c in classifications],
            "section_id": request.section_id,
            "total_found": len(classifications)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)