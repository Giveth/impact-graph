// components/CustomProjectReferenceListComponent.jsx
import React from 'react';
import { Link } from '@adminjs/design-system';

const CustomProjectReferenceListComponent = props => {
  const { record } = props;
  const projectId =
    record.params.project?.id || record.params.projectId || 'N/A';
  const href = `/admin/resources/Project/records/${projectId}/show`;

  return <Link href={href}>Project {projectId}</Link>;
};

export default CustomProjectReferenceListComponent;
