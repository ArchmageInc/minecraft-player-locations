FROM python:3.8-slim
WORKDIR /mclocations

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY server.py .
COPY mclocations mclocations/

EXPOSE 8888

ENTRYPOINT [ "python", "./server.py"]
