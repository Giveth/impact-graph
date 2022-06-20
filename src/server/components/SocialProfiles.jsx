import React from 'react';
import { withTheme } from 'styled-components';
import { Box, Text } from '@admin-bro/design-system';

const SocialProfiles = (props) => {
  const form = props.record.params;

  // need eager true to load relations, you can see the info in browser console
  console.log(form);

  //
  return (<Box>
    <Box>SocialProfiles</Box>
    <Text>
      { 'hello' }
    </Text>
  </Box>);
};

export default withTheme(SocialProfiles);