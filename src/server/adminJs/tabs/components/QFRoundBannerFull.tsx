import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ImageUploadCard = props => {
  const { onChange } = props;

  const [imagePreview, setImagePreview] = useState<string | ArrayBuffer | null>(
    null,
  );

  useEffect(() => {
    if (props.record) {
      const bannerFull = props.record.params.bannerFull;
      if (bannerFull) {
        setImagePreview(bannerFull);
      }
    }
  }, []);

  const handleImageChange = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      onChange('bannerFull', file);
    }
  };

  const handleCardClick = () => {
    const fileInput = document.getElementById('fileInput');
    fileInput?.click();
  };

  const handleDragOver = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      onChange('bannerFull', file);
    }
  };

  return (
    <>
      <Label>Banner Full Image</Label>
      <CardContainer
        onClick={handleCardClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {imagePreview ? (
          <>
            <ImagePreview src={imagePreview} alt="Uploaded" />
          </>
        ) : (
          <UploadText>
            Click here to upload or drag and drop an image
          </UploadText>
        )}
        <FileInput
          type="file"
          accept="image/*"
          id="fileInput"
          onChange={handleImageChange}
        />
      </CardContainer>
    </>
  );
};

export default ImageUploadCard;

const CardContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 200px;
  width: 600px;
  border: 1px solid #ccc;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
  margin-bottom: 2rem;
  justify-self: center;
  margin-inline: auto;
`;

const ImagePreview = styled.img`
  width: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
  border-radius: 8px;
`;

const FileInput = styled.input`
  display: none;
`;

const UploadText = styled.p`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const Label = styled.label`
  font-family: 'Roboto', sans-serif;
  font-size: 12px;
  line-height: 16px;
  margin-bottom: 8px;
`;
