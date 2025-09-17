import { In } from 'typeorm';
import { GlobalConfiguration } from '../entities/globalConfiguration';

export const getGlobalConfigurationValue = async (
  key: string,
): Promise<string | null> => {
  const globalConfig = await GlobalConfiguration.findOne({
    where: { key, isActive: true },
  });
  return globalConfig?.value ?? null;
};

export const getGlobalConfigurationValues = async (
  keys: string[],
): Promise<Record<string, string | null>> => {
  const configs = await GlobalConfiguration.find({
    where: { key: In(keys), isActive: true },
  });

  const result: Record<string, string | null> = {};
  keys.forEach(key => {
    const config = configs.find(c => c.key === key);
    result[key] = config?.value ?? null;
  });

  return result;
};

export const setGlobalConfigurationValue = async (
  key: string,
  value: string,
  description?: string,
  type?: string,
): Promise<GlobalConfiguration> => {
  let config = await GlobalConfiguration.findOne({ where: { key } });

  if (config) {
    config.value = value;
    if (description) config.description = description;
    if (type) config.type = type;
    return await config.save();
  } else {
    config = GlobalConfiguration.create({
      key,
      value,
      description,
      type,
      isActive: true,
    });
    return await config.save();
  }
};

export const getAllGlobalConfigurations = async (): Promise<
  GlobalConfiguration[]
> => {
  return await GlobalConfiguration.find({
    where: { isActive: true },
    order: { key: 'ASC' },
  });
};
