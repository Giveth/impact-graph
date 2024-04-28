import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

type File = {
  name: string;
  size: number;
  type: string;
};

const FileUploader = props => {
  const { onChange, record } = props;
  const [files, setFiles] = useState<File[]>([]);
  const [fileDragging, setFileDragging] = useState(null);
  const [fileDropping, setFileDropping] = useState(null);

  useEffect(() => {
    onChange('sponsorsImgs', files);
    onChange('totalSponsorsImgs', files.length);
  }, [files]);

  useEffect(() => {
    if (record) {
      for (let i = 0; i < 6; i++) {
        const sponsorImg = record.params[`sponsorsImgs.${i}`];
        if (sponsorImg) {
          setFiles(prevFiles => [...prevFiles, sponsorImg]);
        }
      }
    }
  }, []);

  const removeFile = index => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
  };

  const handleDrop = e => {
    e.preventDefault();
    const updatedFiles = [...files];
    const removed =
      fileDragging !== null ? updatedFiles.splice(fileDragging, 1) : [];
    updatedFiles.splice(fileDropping || 0, 0, ...removed);
    while (updatedFiles.length > 6) {
      updatedFiles.pop();
    }
    setFiles(updatedFiles);
    setFileDropping(null);
    setFileDragging(null);
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('index', index);
    setFileDragging(index);
  };

  const handleDragEnd = () => {
    setFileDragging(null);
  };

  const addFiles = e => {
    const newFiles: File[] = Array.from(e.target.files);
    const updatedFiles = [...files, ...newFiles];
    while (updatedFiles.length > 6) {
      updatedFiles.pop();
    }
    setFiles(updatedFiles);
  };

  return (
    <Container>
      <Label>Sponsors Images</Label>
      <FileContainer>
        <DropZone
          onDragOver={e => {
            e.preventDefault();
          }}
          onDrop={handleDrop}
        >
          <StyledInput type="file" multiple onChange={addFiles} />
          <TextContainer>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="mr-1 text-current-50"
              width={24}
              height={24}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p style={{ textAlign: 'center' }}>
              Drag and drop your files here or click to browse
            </p>
          </TextContainer>
        </DropZone>
        {files.length > 0 && (
          <GridContainer
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            {files.map((file, index) => (
              <ImageContainer
                key={index}
                className={fileDragging === index ? 'border-blue-600' : ''}
                draggable="true"
                onDragStart={e => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                data-index={index}
              >
                <CloseButton type="button" onClick={() => removeFile(index)}>
                  <svg
                    className="w-4 h-4 text-gray-700"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{
                      width: '12px',
                    }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </CloseButton>
                <PreviewImage
                  src={
                    typeof file === 'string'
                      ? file
                      : URL.createObjectURL(file as any)
                  }
                />
                <DroppingOverlay
                  isDropping={fileDropping === index && fileDragging !== index}
                />
              </ImageContainer>
            ))}
          </GridContainer>
        )}
      </FileContainer>
    </Container>
  );
};

export default FileUploader;
const Label = styled.label`
  font-family: 'Roboto', sans-serif;
  font-size: 12px;
  line-height: 16px;
  margin-bottom: 8px;
`;

const Container = styled.div`
  background-color: white;
  border-radius: 0.75rem; /* Equivalent to rounded */
  width: 100%;
  margin: auto;
`;

const FileContainer = styled.div`
  position: relative;
  display: flex;
  margin-top: 1rem;
  flex-direction: column;
  padding: 1rem; /* Equivalent to p-4 */
  color: #718096; /* Equivalent to text-gray-400 */
  border: 1px solid #e2e8f0; /* Equivalent to border */
  border-radius: 0.375rem; /* Equivalent to rounded */
`;

const DropZone = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px dashed #e2e8f0; /* Equivalent to border-dashed */
  border-radius: 0.375rem; /* Equivalent to rounded */
  cursor: pointer;
  &:hover {
    border-color: #4a90e2; /* Equivalent to border-blue-400 */
    box-shadow: 0 0 0 0.25rem #4a90e2; /* Equivalent to ring-4 */
  }
`;

const StyledInput = styled.input`
  position: absolute;
  inset: 0;
  z-index: 50;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
`;

const TextContainer = styled.div`
  justify-content: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-block: 2rem;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;
  @media (min-width: 768px) {
    grid-template-columns: repeat(6, 1fr);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  text-align: center;
  background-color: #f3f4f6;
  border: 1px solid #cbd5e0;
  border-radius: 0.375rem;
  cursor: move;
  user-select: none;
  padding-top: 100%;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  z-index: 50;
  padding: 0.25rem;
  background-color: #fff;
  border-radius: 0 0.375rem 0 0;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const PreviewImage = styled.img`
  position: absolute;
  inset: 0;
  z-index: 0;
  object-fit: cover;
  width: 100%;
  height: 100%;
  border: 0px solid #fff;
`;

const DroppingOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 40;
  transition: background-color 0.3s;
  ${({ isDropping }) =>
    isDropping && 'background-color: rgba(173, 216, 230, 0.5);'}
`;
