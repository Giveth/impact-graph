import React from 'react';
import { withTheme } from 'styled-components';
import { Box, Text } from '@admin-bro/design-system';

const ListOrganizationsNames = (props) => {
  const token = props.record.params;

  // Filter organizations from params format and delete null values
  const organizations = [
    token['organizations.0.name'],
    token['organizations.1.name'],
    token['organizations.2.name'],
    token['organizations.3.name'],
  ].filter(o => o);

  return <Box>
    <Text>
      {organizations.join(', ')}
    </Text>
  </Box>;
};

export default withTheme(ListOrganizationsNames);