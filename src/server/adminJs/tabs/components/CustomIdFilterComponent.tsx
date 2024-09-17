import React from 'react';
import { FormGroup, Label, Input } from '@adminjs/design-system';

const CustomIdFilterComponent = props => {
  const { onChange, property, filter } = props;
  const handleChange = event => {
    onChange(property.path, event.target.value);
  };

  return (
    <FormGroup>
      <Label>{property.label}</Label>
      <Input
        type="text"
        onChange={handleChange}
        value={filter[property.path] || ''}
        placeholder={`Enter ${property.label} ID`}
        style={{
          color: 'white',
          backgroundColor: 'rgba(255, 255, 255, 0.1)', // Semi-transparent white background
          borderColor: 'rgba(255, 255, 255, 0.3)', // Lighter border for contrast
        }}
      />
    </FormGroup>
  );
};

export default CustomIdFilterComponent;
