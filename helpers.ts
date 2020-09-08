import { getRepository, Column, ColumnOptions } from 'typeorm'
import * as bcrypt from 'bcryptjs'

import { Organisation } from './entities/organisation'
import { OrganisationUser } from './entities/organisationUser'
// import { OrganisationProject } from './entities/organisationProject'
import { Project } from './entities/project'
import { User } from './entities/user'

export async function seedDatabase () {
  const projectRepository = getRepository(Project)
  const organisationRepository = getRepository(Organisation)
  const organisationUserRepository = getRepository(OrganisationUser)
  // const organisationProjectRepository = getRepository(OrganisationProject)
  const userRepository = getRepository(User)

  const seedPassword = 'qweqweqwe'
  const superAdminUser = userRepository.create({
    email: 'jamespfarrell@gmail.com',
    firstName: 'James',
    password: bcrypt.hashSync(seedPassword, 12),
    confirmed: true,
    loginType: 'password'
  })
  const icrcAdmin = userRepository.create({
    email: 'icrcAdmin@icrcAdmin.com',
    firstName: 'icrcAdmin',
    password: bcrypt.hashSync(seedPassword, 12),
    confirmed: true,
    loginType: 'password'
  })

  const ifrcAdmin = userRepository.create({
    email: 'ifrcAdmin@icrcAdmin.com',
    firstName: 'ifrcAdmin',
    password: bcrypt.hashSync(seedPassword, 12),
    confirmed: true,
    loginType: 'password'
  })
  await userRepository.save([superAdminUser, icrcAdmin, ifrcAdmin])

  const covidProject = projectRepository.create({
    title: 'COVID-19: ICRC global response to the coronavirus',
    description: `Professionals with a background in health, disaster management, water, sanitation, food and economic security, and logistics attended the 4th edition of the Regional HELP (Health Emergencies in Large Populations) course held in Delhi from 24 February to 6 March 2020. The two-week programme prepared participants, who came from nine countries, for effectively leading an emergency health response.

        In India, the HELP course is organized by the ICRC in partnership with International Institute of Health Management Research (IIHMR), National Institute of Disaster Management, World Health Organization (WHO) and the Indian Red Cross Society. It aims to enhance professionalism in health emergency response with an emphasis on decision-making. It uses the public health approach, fostering multidisciplinary responses and bringing out challenges, dilemmas, norms, standards and principles. This synergy between the field expertise of the ICRC and the academic expertise of IIHMR makes the course different from other HELP courses conducted around the world.`
  })
  console.log(`aProject1 : ${JSON.stringify(covidProject, null, 2)}`)

  await projectRepository.save(covidProject)
  console.log(`aProject2 : ${JSON.stringify(covidProject, null, 2)}`)

  const icrcOrg = organisationRepository.create([
    {
      title: 'International Committee of the Red Cross (ICRC)',
      description:
        'Established in 1863, the ICRC operates worldwide, helping people affected by conflict and armed violence and promoting the laws that protect victims of war. An independent and neutral organization, its mandate stems essentially from the Geneva Conventions of 1949. We are based in Geneva, Switzerland, and employ some 16,000 people in more than 80 countries. The ICRC is funded mainly by voluntary donations from governments and from National Red Cross and Red Crescent Societies.'
    },
    {
      title: 'Giveth',
      description: 'Giveth is the future of giving.'
    },
    {
      title: 'Gaia Protection',
      description:
        'The Madre Tierra Verde Foundation aims to contribute to the transition of Costa Rican society towards a paradigm of a green and intelligent society, following the guidelines of the National Strategy for Decarbonizing the Economy, through guidance and advice to organizations, communities and governments.'
    }
  ])

  await organisationRepository.save(icrcOrg)
  // Seed join table
  // const organisationProject = organisationProjectRepository.create({
  //   organisation: icrcOrg[0],
  //   project: covidProject
  // })
  // await organisationProjectRepository.save(organisationProject)

  const adminOrganisationUser = organisationUserRepository.create({
    role: 'admin',
    organisation: icrcOrg[0],
    user: icrcAdmin
  })
  await organisationUserRepository.save(adminOrganisationUser)

  // const icrcProjects = projectRepository.create([
  //   {
  //     title: 'COVID-19: ICRC global response to the coronavirus',
  //     description: `Professionals with a background in health, disaster management, water, sanitation, food and economic security, and logistics attended the 4th edition of the Regional HELP (Health Emergencies in Large Populations) course held in Delhi from 24 February to 6 March 2020. The two-week programme prepared participants, who came from nine countries, for effectively leading an emergency health response.

  //       In India, the HELP course is organized by the ICRC in partnership with International Institute of Health Management Research (IIHMR), National Institute of Disaster Management, World Health Organization (WHO) and the Indian Red Cross Society. It aims to enhance professionalism in health emergency response with an emphasis on decision-making. It uses the public health approach, fostering multidisciplinary responses and bringing out challenges, dilemmas, norms, standards and principles. This synergy between the field expertise of the ICRC and the academic expertise of IIHMR makes the course different from other HELP courses conducted around the world.`,
  //     organisations
  //   },
  //   {
  //     title:
  //       'India: HELP course trains professionals to effectively lead an emergency health response',
  //     description: `The COVID-19 pandemic (or coronavirus) is unprecedented in recent history and is spreading rapidly. It is not only a public health crisis, but also a humanitarian crisis in the making.

  //     In war-torn countries, COVID-19 represents a dramatic threat to life. Health systems have already been ravaged by violence, and the threat of further strain on health care from the coronavirus is an enormous risk for communities.

  //     Plans to prevent and respond to the virus must urgently move forward before it gains a foothold in countries in conflict.`,
  //     organisations
  //   }
  // ])
  // //organisations[0].projects = icrcProjects

  // const ifrcProjects = projectRepository.create([
  //   {
  //     title: 'Water, sanitation and hygiene promotion',
  //     description: `There are 7 billion people on the planet today and by 2050, we will have welcomed another 2 billion. Currently an estimated 2.5 billion do not have access to basic sanitation, and 1.1 billion of those people still practice open defecation (15 per cent of the world’s total population).

  //     This is not only ‘an affront to human dignity’, but also a serious public health issue as faecal–oral transmitted diseases such as diarrhoea, cause at least 1.5 million deaths per year in children under 5. Water is essential for human life, but it is not enough.

  //     In line with the old adage that prevention is better than cure, providing clinical health services without improving infrastructure and hygiene awareness is counterproductive, as too many resources are invested and ultimately wasted. We have seen historically that the biggest health advances at the start of the 20th century came as people earned higher incomes and enjoyed greater access to sewage systems, safe water supplies and medical care. Developing countries of today can expect similar advances in health, dignity and economic growth but only if sanitation is viewed as an equal priority.`,
  //     organisations
  //   },
  //   {
  //     title: 'Maternal, newborn, and child health',
  //     description: `Every year, 60 million women give birth at home with no access to skilled care. More than 500,000 women die from complications in pregnancy and childbirth, 4 million newborn babies die every year before they are 1 month old, 3 million are stillborn. The International Federation of Red Cross and Red Crescent Societies (IFRC) knows that the health of mothers and children play an integral part in the struggle to reduce poverty.

  //     Through its network of National Red Cross Red and Crescent Societies, the IFRC has been supporting and implementing health initiatives related to reproductive, maternal, newborn and child health for over 20 years. The IFRC is committed to “Making Every Mother and Child Count”, by working with partners to achieve Millennium Development Goals 4 and 5 to dramatically reduce child mortality and improve maternal health by 2015. As part of this strategy, the IFRC cooperates with the WHO, UNICEF and UNFPA and is part of an inter-agency working group to promote and facilitate reproductive health programmes.
  //     `,
  //     organisations
  //   },
  //   {
  //     title: 'First Aid',
  //     description: `The IFRC is one of the world’s leading first aid providers. First aid is a humanitarian act that should be accessible to all. With first aid skills volunteers and communities are empowered to save lives without discrimination.
  //     One hundred and fifty years ago, a battle in northern Italy sparked an idea that has since changed the world. On 24 June 1859, Henry Dunant, a young Geneva businessman, witnessed horrifying suffering and agony following the battle of Solferino. The need for humanitarian action is still as vital today as it was in 1859.

  //     Millions of people are hurt or killed by injuries every year due to inadequate response or lack of timely assistance. Taking immediate action and applying the appropriate techniques, while waiting for professional help, can considerably reduce deaths and injuries, and the impact of disasters and everyday emergencies. First aid is not a replacement for emergency services. It is a vital initial step for providing effective and swift action that helps to reduce serious injuries and improve the chances of survival.

  //     People living in war-torn or disaster-affected areas are often not given the opportunity to be trained in basic first aid. First aid awareness is lacking in many vulnerable communities, where a very basic idea of how to treat an injury or keep someone alive, would have real impact. We believe that first aid reduces vulnerabilities and helps build stronger communities.

  //     Have you completed the IFRC’s online first aid course looking at five of the most common causes of injuries in children and infants? Sign-up to the introductory course to learn key first aid skills for free
  //     `,
  //     organisations
  //   },
  //   {
  //     title: 'Voluntary blood donation',
  //     description: `Blood donation
  //     About 108 million blood donations are collected worldwide each year. Almost half of these are collected in high-income countries, home to 15 per cent of the world’s population. Although there has been an increase of almost 8 million blood donations from voluntary unpaid donors from 2004 to 2011, equitable access to safe blood still does not exist for many of those who need it.

  //     There are chronic shortages of safe blood and blood products in many countries, so blood transfusion is not available for many of the world’s most vulnerable populations.

  //     A system of regular and voluntary non-remunerated blood donation (VNRBD) is critical for high-quality blood service delivery. Promoting equity, access, quality and safety of blood and blood components is indispensable to achieve the Millennium Development Goals.

  //     Our approach
  //     The IFRC is uniquely placed to improve the safety and accessibility of blood supply. We have the largest humanitarian network of volunteers in the world and, therefore, considerable experience in keeping, motivating and supporting our volunteers. This knowledge is equally relevant for the retention of blood donors: we support global health security by promoting VNRBD and advocating for the safe provision of blood products and services.

  //     At the global level
  //     The IFRC has always been at the forefront of promoting VNRBD, at both advocacy and capacity-building levels. The long experience of National Red Cross and Red Crescent Societies in supplying blood and blood products meant that our voice was heard when we advocated for recognition of VNRBD on the global health agenda. In 1975, the World Health Assembly urged its member states to promote national voluntary and non-remunerated blood services. Another key milestone in our advocacy work, and that of three other founding partners, was the establishment in 2004 of World Blood Donor Day, a day that continues to be an occasion for reiterating the importance of VNRBD worldwide. In 2001, the IFRC established the Global Advisory Panel on Corporate Governance and Risk Management for Red Cross and Red Crescent Societies. This panel of experts is now available for countries requesting technical expertise in all aspects of risk management, as spelled out in the IFRC’s Blood Policy, which was adopted in 2011. In addition, the Global Framework for Action: Towards 100 per cent Voluntary Blood Donation, jointly developed with the World Health Organization, provides guidance and support to countries seeking to establish effective VNRBD programmes.

  //     At the national and community levels
  //     In many countries, National Red Cross and Red Crescent Societies, as auxiliaries to their governments, play an important role in promoting safe and sustainable blood programmes. National Society engagement in blood programmes in some cases means responsibility for blood collection and supply. About one-quarter of National Societies are responsible for blood service delivery in their national blood programmes, while around 63 per cent are engaged in systematic blood donor recruitment activities or advocacy for and promotion of VNRBD. Club 25 is one of many successful initiatives that National Societies support. Through this initiative, young donors provide blood to save lives and encourage other young people to do the same (see case study).

  //     Impact
  //     According to 2011 WHO data, 60 countries, including some with limited resources, have a blood supply based entirely on voluntary and nonremunerated blood donations. These donations have an impact on almost every aspect of modern medicine. With more than 34 million donations of blood given annually worldwide, the reach of Red Cross Red Crescent blood donors cannot be quantified. However, it is happening every minute of each day, 365 days a year, saving lives day in, day out with the gift of blood. The viability of a country’s blood service, however, rests with its government and its commitment to safer blood starts with enforcing a national blood policy based on the principle of 100 per cent voluntary blood donation.
  //     `,
  //     organisations
  //   }
  // ])

  // //organisations[1].projects = ifrcProjects

  // await projectRepository.save(ifrcProjects)
  // await projectRepository.save(icrcProjects)

  // await projectRepository.save(projects)

  // const recipes = recipeRepository.create([
  //   {
  //     title: 'Recipe 1',
  //     description: 'Desc 1',
  //     author: defaultUser,
  //     ratings: ratingsRepository.create([
  //       { value: 2, user: defaultUser },
  //       { value: 4, user: defaultUser },
  //       { value: 5, user: defaultUser },
  //       { value: 3, user: defaultUser },
  //       { value: 4, user: defaultUser }
  //     ])
  //   },
  //   {
  //     title: 'Recipe 2',
  //     author: defaultUser,
  //     ratings: ratingsRepository.create([
  //       { value: 2, user: defaultUser },
  //       { value: 4, user: defaultUser }
  //     ])
  //   }
  // ])
  // await recipeRepository.save(recipes)

  return {
    defaultUser: superAdminUser
  }
}

export function RelationColumn (options?: ColumnOptions) {
  return Column({ nullable: true, ...options })
}
