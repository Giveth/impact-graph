import { ComponentLoader } from 'adminjs';

const componentLoader = new ComponentLoader();

const Components = {
  ClickableLink: componentLoader.add('ClickableLink', './ClickableLink'),
  FilterListedComponent: componentLoader.add(
    'FilterListedComponent',
    './FilterListedComponent',
  ),
  ListOrganizationsNames: componentLoader.add(
    'ListOrganizationsNames',
    './ListOrganizationsNames',
  ),
  ListProjectAddresses: componentLoader.add(
    'ListProjectAddresses',
    './ListProjectAddresses',
  ),
  MDtoHTML: componentLoader.add('MDtoHTML', './MDtoHTML'),
  ProjectUpdates: componentLoader.add('ProjectUpdates', './ProjectUpdates'),
  VerificationFormMilestones: componentLoader.add(
    'VerificationFormMilestones',
    './VerificationFormMilestones',
  ),
  VerificationFormProjectRegistry: componentLoader.add(
    'VerificationFormProjectRegistry',
    './VerificationFormProjectRegistry',
  ),
  VerificationFormSocials: componentLoader.add(
    'VerificationFormSocials',
    './VerificationFormSocials',
  ),
};

export { componentLoader, Components };
