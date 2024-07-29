import { DataSource } from 'typeorm';
import ormConfig from './ormconfig.js';

const datasource = new DataSource(ormConfig);
datasource.initialize();
export default datasource;
