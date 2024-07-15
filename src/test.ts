import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import config from './config.js';
import { Project } from './entities/project.js';
import { AppDataSource } from './orm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(
  __dirname,
  `../config/${process.env.NODE_ENV || ''}.env`,
);
dotenv.config({
  path: configPath,
});

const fun = async () => {
  await AppDataSource.initialize();
  const pa = await Project.findOneBy({ id: 1 });
  const p = process.env.TYPEORM_DATABASE_NAME;
  const a = config.get('TYPEORM_DATABASE_NAME');
  console.log(p, a, pa);
};

await fun();
