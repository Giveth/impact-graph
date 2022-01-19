import React from 'react'
import Select from 'react-select/async'
import { withTheme } from 'styled-components'
import { FormGroup, filterStyles, Label } from '@admin-bro/design-system'

const FilterListedComponent = props => {
  const { onChange, property, theme } = props;

  const handleChange = (selected) => {
    onChange(property.path, selected ? selected.value : '')
  }

  return (
    <FormGroup>
      <Label>{property.label}</Label>
      <Select
        value={typeof selected === 'undefined' ? undefined : selected}
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
  )
}

export default withTheme(FilterListedComponent);
