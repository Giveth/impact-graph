// components/CustomProjectReferenceShowComponent.jsx
import React from 'react';
import { Link, ValueGroup } from '@adminjs/design-system';

const CustomProjectReferenceShowComponent = props => {
  const { record } = props;
  const projectId =
    record.params.project?.id || record.params.projectId || 'N/A';
  const href = `/admin/resources/Project/records/${projectId}/show`;

  return (
    <ValueGroup label="Project">
      <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
        {projectId}
      </Link>
    </ValueGroup>
  );
};

export default CustomProjectReferenceShowComponent;
