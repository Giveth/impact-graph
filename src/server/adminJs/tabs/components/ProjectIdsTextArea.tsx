import React, { useEffect, useState } from 'react';
import { withTheme } from 'styled-components';
import { TextArea } from '@adminjs/design-system';
import { getRelatedProjectsOfQfRound } from '../../../../repositories/qfRoundRepository';

const ProjectIdsTextArea = props => {
  const { onChange, record } = props;
  const [projectIds, setProjectIds] = useState('');

  useEffect(() => {
    const asyncFunc = async () => {
      const qfRoundId = record?.params?.qfRoundId || record?.params?.id;
      const qfRoundProjects = await getRelatedProjectsOfQfRound(qfRoundId);
      console.log('qfRoundProjects', qfRoundProjects);

      const ids = qfRoundProjects.map(project => project.slug).join(',');
      console.log('ids', ids);

      setProjectIds(ids);
    };

    asyncFunc();
  }, []);

  return <TextArea onChange={onChange} value={projectIds} />;
};

export default withTheme(ProjectIdsTextArea);
