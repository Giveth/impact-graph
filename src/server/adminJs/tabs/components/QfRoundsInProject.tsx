import React from 'react';
import { withTheme } from 'styled-components';
import { Section, Label, Link } from '@adminjs/design-system';

const QfRoundsInProject = props => {
  const qfRounds = props?.record?.params?.qfRounds;
  return (
    <div>
      <Label>Qf Rounds</Label>
      <Section>
        {qfRounds?.map(qfRound => {
          const { id, name, isActive } = qfRound;
          const qfRoundLink = `/admin/resources/QfRound/records/${id}/show`;
          return (
            <div key={id}>
              <br />

              <Section>
                <h1>{name}</h1>
                <Link href={qfRoundLink || ''} target="_blank">
                  {qfRoundLink}
                </Link>
              </Section>

              <Section>
                <Label>status</Label>
                {isActive ? 'Active' : 'Inactive'}
              </Section>
            </div>
          );
        })}
      </Section>
      <br />
    </div>
  );
};

export default withTheme(QfRoundsInProject);
