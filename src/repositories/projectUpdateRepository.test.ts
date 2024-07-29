import { assert } from 'chai';
import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../test/testUtils.js';
import { ProjectUpdate } from '../entities/project.js';
import { SUMMARY_LENGTH } from '../constants/summary.js';
import { getHtmlTextSummary } from '../utils/utils.js';

describe('update contentSummary test cases', updateContentSummaryTestCases);

function updateContentSummaryTestCases() {
  const SHORT_CONTENT = '<div>Short Content</div>';
  const SHORT_CONTENT_SUMMARY = 'Short Content';

  it('should set content summary on creation', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const projectUpdate = await ProjectUpdate.create({
      userId: project.adminUserId,
      projectId: project.id,
      content: SHORT_CONTENT,
      title: 'title',
      createdAt: new Date(),
      isMain: false,
    }).save();

    assert.equal(projectUpdate.contentSummary, SHORT_CONTENT_SUMMARY);
  });

  it('should update content summary on update', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    let projectUpdate: ProjectUpdate | null = await ProjectUpdate.create({
      userId: project.adminUserId,
      projectId: project.id,
      content: 'content',
      title: 'title',
      createdAt: new Date(),
      isMain: false,
    }).save();

    projectUpdate.content = SHORT_CONTENT;
    await projectUpdate.save();
    projectUpdate = await ProjectUpdate.findOne({
      where: { id: projectUpdate.id },
    });
    assert.equal(projectUpdate?.contentSummary, SHORT_CONTENT_SUMMARY);
  });

  it('should set limited length description summary', async () => {
    const longContent = `
    <div>
      ${
        SHORT_CONTENT.repeat(
          Math.ceil(SUMMARY_LENGTH / SHORT_CONTENT_SUMMARY.length),
        ) + 1
      }
    </div>
    `;

    const project = await saveProjectDirectlyToDb(createProjectData());
    const projectUpdate = await ProjectUpdate.create({
      userId: project.adminUserId,
      projectId: project.id,
      content: longContent,
      title: 'title',
      createdAt: new Date(),
      isMain: false,
    }).save();

    assert.isOk(projectUpdate.contentSummary);
    assert.lengthOf(projectUpdate.contentSummary as string, SUMMARY_LENGTH);
    assert.equal(projectUpdate.contentSummary, getHtmlTextSummary(longContent));
  });
}
