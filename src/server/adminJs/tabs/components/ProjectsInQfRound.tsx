import React, { useState } from 'react';
import { withTheme } from 'styled-components';
import { Section, Label, Link, Button, Box } from '@adminjs/design-system';

const ProjectsInQfRound = props => {
  const projects = props?.record?.params?.projects || [];
  const projectsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate total pages
  const totalPages = Math.ceil(projects.length / projectsPerPage);

  // Get projects for the current page
  const startIndex = (currentPage - 1) * projectsPerPage;
  const endIndex = startIndex + projectsPerPage;
  const currentProjects = projects.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = newPage => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div>
      <Label>Related Projects</Label>
      <Section>
        {currentProjects.length > 0
          ? currentProjects.map(project => {
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
            })
          : 'No related projects found.'}
      </Section>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt="20px">
          <Button
            variant="primary"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11 6L1 6M1 6L6 1M1 6L6 11"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </Button>
          <Box mx="10px" alignSelf="center">
            Page {currentPage} of {totalPages}
          </Box>
          <Button
            variant="primary"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 6L11 6M11 6L6 1M11 6L6 11"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </Button>
        </Box>
      )}
      <br />
    </div>
  );
};

export default withTheme(ProjectsInQfRound);
