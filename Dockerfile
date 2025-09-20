# Dockerfile for Manas AI Wellness App

# Use an official Python image as a base
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /code

# Copy the requirements file first to leverage Docker cache
COPY ./requirements.txt /code/requirements.txt

# Install system dependencies needed for audio/image processing, especially ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Install the Python packages
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of your application code into the container
COPY . /code/

# Tell Docker that the container listens on port 7860 (a common default for HF Spaces)
EXPOSE 7860

# The command to run your application when the container starts
# The host must be 0.0.0.0 to be accessible from outside the container
CMD ["uvicorn", "main:py", "--host", "0.0.0.0", "--port", "7860"]