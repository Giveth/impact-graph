import React from 'react';
import { withTheme } from 'styled-components';
import { Section, Label } from '@adminjs/design-system';

const ProjectUpdates = props => {
  const categories = props?.record?.params?.categories;
  return (
    <div>
      <Label>Project Categories</Label>
      <Section>
        {categories?.map(category => {
          return (
            <div key={category.id}>
              <br />
              <Section>
                <Label>Name</Label>
                <h1>{category.name || ''} - Id: {category.id}</h1>
              </Section>
            </div>
          );
        })}
      </Section>
      <br />
    </div>
  );
};

export default withTheme(ProjectUpdates);
