import os

images_dir = "frontend/public/images"
for f in os.listdir(images_dir):
    if f.endswith('.jpg'):
        path = os.path.join(images_dir, f)
        with open(path, 'rb') as file:
            header = file.read(3)
            print(f"{f}: size={os.path.getsize(path)} header={header.hex().upper()}")
