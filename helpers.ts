import { getRepository, Column, ColumnOptions } from "typeorm";

import { Recipe } from "./entities/recipe";
import { Project } from "./entities/project";
import { Rate } from "./entities/rate";
import { User } from "./entities/user";

export async function seedDatabase() {
  const projectRepository = getRepository(Project);
  const recipeRepository = getRepository(Recipe);
  const ratingsRepository = getRepository(Rate);
  const userRepository = getRepository(User);

  const defaultUser = userRepository.create({
    email: "test@github.com",
    nickname: "MichalLytek",
    password: "s3cr3tp4ssw0rd",
  });
  await userRepository.save(defaultUser);
  const projects = projectRepository.create([
    {
      title: 'Red Kite', 
      description: 'This is a project monoring and evaluation tool for the red cross',
      author: defaultUser
    }, {
      title: 'Red Sky', 
      description: 'This will make it easier to track expenses',
      author: defaultUser
    }])
    
  await projectRepository.save(projects);

  const recipes = recipeRepository.create([
    {
      title: "Recipe 1",
      description: "Desc 1",
      author: defaultUser,
      ratings: ratingsRepository.create([
        { value: 2, user: defaultUser },
        { value: 4, user: defaultUser },
        { value: 5, user: defaultUser },
        { value: 3, user: defaultUser },
        { value: 4, user: defaultUser },
      ]),
    },
    {
      title: "Recipe 2",
      author: defaultUser,
      ratings: ratingsRepository.create([
        { value: 2, user: defaultUser },
        { value: 4, user: defaultUser },
      ]),
    },
  ]);
  await recipeRepository.save(recipes);

  return {
    defaultUser,
  };
}

export function RelationColumn(options?: ColumnOptions) {
  return Column({ nullable: true, ...options });
}
