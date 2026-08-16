import uvicorn
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

if __name__ == "__main__":
    os.chdir(os.path.join(os.getcwd(), 'backend'))
    uvicorn.run("app:app", host="127.0.0.1", port=8088, reload=False)
