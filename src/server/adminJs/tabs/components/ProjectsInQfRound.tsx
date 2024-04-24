import React from 'react';
import { withTheme } from 'styled-components';
import { Section, Label, Link } from '@adminjs/design-system';

const ProjectsInQfRound = props => {
  const projects = props?.record?.params?.projects;

  return (
    <div>
      <Label>Related Projects</Label>
      <Section>
        {projects.map(project => {
          const { id, title, slug } = project;
          const projectLink = `/admin/resources/Project/records/${id}/show`;
          return (
            <div key={id}>
              <br />
              <Section>
                <h1>{title}</h1>
                <h2>{slug}</h2>
                <br />
                <Link href={projectLink || ''} target="_blank">
                  {projectLink}
                </Link>
              </Section>
            </div>
          );
        })}
      </Section>
      <br />
    </div>
  );
};

export default withTheme(ProjectsInQfRound);
