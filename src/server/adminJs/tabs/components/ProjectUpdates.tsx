import React from 'react';
import { withTheme } from 'styled-components';
import { Section, Label, Link } from '@adminjs/design-system';

const ProjectUpdates = props => {
  const projectUpdates = props?.record?.params?.projectUpdates;
  const adminJsBaseUrl = props?.record?.params?.adminJsBaseUrl;

  return (
    <div>
      <Label>Project Updates</Label>
      <Section>
        {projectUpdates?.map(projectUpdate => {
          const { id, title, userId, content, createdAt } = projectUpdate;
          const userLink = `${adminJsBaseUrl}/admin/resources/User/records/${userId}/show`;
          const updateLink = `${adminJsBaseUrl}/admin/resources/ProjectUpdate/records/${id}/show`;
          return (
            <div key={id}>
              <br />

              <Section>
                <Label>Title</Label>
                <h1>{title || ''}</h1>
              </Section>
              <Section>
                <Label>Content</Label>
                {content || ''}
              </Section>
              <Section>
                <Label>AdminJS User Link</Label>
                <Link href={userLink || ''} target="_blank">
                  {userLink}
                </Link>
              </Section>
              <Section>
                <Label>Project Update AdminJS Edit Link</Label>
                <Link href={updateLink || ''} target="_blank">
                  {updateLink}
                </Link>
              </Section>
              <Section>
                <Label>createdAt</Label>
                {createdAt}
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
