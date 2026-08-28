from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.api.routes import router
from app.config import config

app = FastAPI(
    title="Tourist Safety & Area Risk Intelligence System API",
    description=(
        "An AI-powered REST API that evaluates and predicts safety metrics for geographic areas "
        "in India. This API serves as a machine learning backend, exposing endpoints to compute "
        "safety scores, retrieve nearby zones, and recommend safer routes/alternatives."
    ),
    version=config.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Validation Exception Handler for clean error responses
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Extract clean error details
    errors = exc.errors()
    error_messages = []
    for err in errors:
        loc = " -> ".join(str(x) for x in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        error_messages.append(f"Field '{loc}': {msg}")
        
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "data": None,
            "message": "Validation error: " + "; ".join(error_messages)
        }
    )

# Include routes directly at root level
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    # This allows direct execution of main.py for debugging
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
