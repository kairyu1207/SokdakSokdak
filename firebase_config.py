import pyrebase
import os
from dotenv import load_dotenv

load_dotenv()

firebase_config = {
    "apiKey": os.getenv("FIREBASE_API_KEY"),
    "authDomain": "hackertonpractice-35514.firebaseapp.com",
    "databaseURL": "https://hackertonpractice-35514-default-rtdb.asia-southeast1.firebasedatabase.app",
    "storageBucket": "hackertonpractice-35514.firebasestorage.app",
    "serviceAccount": "hackertonpractice-35514-firebase-adminsdk-fbsvc-4cbe6488fd.json"
}

firebase = pyrebase.initialize_app(firebase_config)
db = firebase.database()