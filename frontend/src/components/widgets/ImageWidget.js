import React from 'react';

const ImageWidget = ({ id, data, onUpload }) => {
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="image-widget bg-white shadow-md rounded px-4 py-2 mb-4 relative">
      {data.imageUrl ? (
        <img src={data.imageUrl} alt="Uploaded" className="w-full h-auto" />
      ) : (
        <div>
          <p className="text-gray-500">Upload Image:</p>
          <input type="file" onChange={handleImageUpload} className="w-full" />
        </div>
      )}
    </div>
  );
};

export default ImageWidget;