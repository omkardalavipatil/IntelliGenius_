from flask import Flask
import subprocess

app = Flask(__name__)

@app.route('/open-whatsapp', methods=['GET'])
def open_whatsapp():
    try:
        # Replace the following command with your actual command to open WhatsApp
        subprocess.run(["python", "path/to/your/python_script.py"])
        return "WhatsApp opened successfully."
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == '__main__':
    app.run(debug=True)
