import React from 'react';
import { withTheme } from 'styled-components';
import { Box, Text } from '@admin-bro/design-system';

const ListOrganizationsNames = (props) => {
  const token = props.record.params;

  // Filter organizations from params format
  const tokenKeys = Object.keys(token);
  const organizationsKeys = tokenKeys.filter((key) => key.includes('organizations') && key.includes('name'));
  const organizations = [];
  for (const organizationKey of organizationsKeys) {
    organizations.push(token[organizationKey]);
  };

  return <Box>
    <Text>
      {organizations.join(', ')}
    </Text>
  </Box>;
};

export default withTheme(ListOrganizationsNames);