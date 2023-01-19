// @ts-ignore
import React from 'react';
import Select from 'react-select/async';
import { withTheme } from 'styled-components';
import { FormGroup, filterStyles, Label } from '@adminjs/design-system';

const FilterListedComponent = props => {
  const { onChange, property, theme, value } = props;

  const handleChange = selected => {
    onChange(property.path, selected ? selected.value : '');
  };

  return (
    <FormGroup>
      <Label>{property.label}</Label>
      <Select
        value={value === undefined ? undefined : value}
        isClearable
        cacheOptions
        onChange={handleChange}
        styles={filterStyles(theme)}
        defaultOptions={[
          { value: true, label: 'Listed' },
          { value: false, label: 'Unlisted' },
          { value: undefined, label: 'Not Reviewed' },
        ]}
      />
    </FormGroup>
  );
};

export default withTheme(FilterListedComponent);
