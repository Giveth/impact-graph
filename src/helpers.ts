import config from './config';
import { getRepository, Column, ColumnOptions } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { Organisation } from './entities/organisation';
import { OrganisationUser } from './entities/organisationUser';
// import { OrganisationProject } from './entities/organisationProject'
import { Project } from './entities/project';
import { Category } from './entities/category';
import { Donation } from './entities/donation';
import { User } from './entities/user';

import projectBg from './constants/projectBg';

export async function seedDatabase() {
  const categoryRepository = getRepository(Category);
  const projectRepository = getRepository(Project);
  const donationRepository = getRepository(Donation);
  const organisationRepository = getRepository(Organisation);
  const organisationUserRepository = getRepository(OrganisationUser);
  // const organisationProjectRepository = getRepository(OrganisationProject)
  const userRepository = getRepository(User);

  const seedPassword = config.get('SEED_PASSWORD').toString();
  const serverEmail = config.get('SERVER_ADMIN_EMAIL').toString();
  const users: User[] = [];

  /**
   * { name: 'sdg-poverty', value: 'End Poverty', source: 'SDG' },
    { name: 'sdg-hunger', value: 'Zero Hunger', source: 'SDG' },
    { name: 'sdg-health', value: 'Good Health and Well-being', source: 'SDG' },
    { name: 'sdg-education', value: 'Quality Education', source: 'SDG' },
    { name: 'sdg-gender-equality', value: 'Gender Equality', source: 'SDG' },
    { name: 'sdg-clean-water', value: 'Clean Water and Sanitation', source: 'SDG' },
    { name: 'sdg-energy', value: 'Affordable and Clean Energy', source: 'SDG' },
    { name: 'sdg-economic-growth', value: 'Decent Work and Economic Growth', source: 'SDG' },
    { name: 'sdg-innovation-infrastructure', value: 'Industry, Innovation and Infrastructure', source: 'SDG' },
    { name: 'sdg-reduce-inequality', value: 'Reduced Inequality', source: 'SDG' },
    { name: 'sdg-sustainable-communities', value: 'Sustainable Cities and Communities', source: 'SDG' },
    { name: 'sdg-responsible-production', value: 'Responsible Consumption and Production', source: 'SDG' },
    { name: 'sdg-climate-action', value: 'Climate Action', source: 'SDG' },
    { name: 'sdg-life-water', value: 'Life Below Water', source: 'SDG' },
    { name: 'sdg-life-land', value: 'Life On Land', source: 'SDG' },
    { name: 'sdg-justice', value: 'Peace and Justice Strong Institutions', source: 'SDG' },
    { name: 'sdg-partnership  ', value: 'Partnerships to achieve the Goal', source: 'SDG' },
   */

  const categorySeeds = categoryRepository.create([
    { name: 'community', value: 'Community', source: 'adhoc' },
    { name: 'food', value: 'Food', source: 'adhoc' },
    { name: 'non-profit', value: 'Non-profit', source: 'adhoc' },
    { name: 'housing', value: 'Housing', source: 'adhoc' },
    { name: 'technology', value: 'Technology', source: 'adhoc' },
    { name: 'research', value: 'Research', source: 'adhoc' },
    { name: 'nutrition', value: 'Nutrition', source: 'adhoc' },
    { name: 'art-culture', value: 'Art & Culture', source: 'adhoc' },

    { name: 'agriculture', value: 'Agriculture', source: 'IRIS' },
    { name: 'air', value: 'Air', source: 'IRIS' },
    { name: 'biodiversity', value: 'Biodiversity', source: 'IRIS' },
    { name: 'climate', value: 'Climate', source: 'IRIS' },
    { name: 'inclusion', value: 'Inclusion', source: 'IRIS' },
    { name: 'education', value: 'Education', source: 'IRIS' },
    { name: 'employment', value: 'Employment', source: 'IRIS' },
    { name: 'energy', value: 'Energy', source: 'IRIS' },
    { name: 'finance', value: 'Finance', source: 'IRIS' },
    { name: 'health', value: 'Health', source: 'IRIS' },
    { name: 'infrastructure', value: 'Infrastructure', source: 'IRIS' },
    { name: 'land', value: 'Land', source: 'IRIS' },
    { name: 'oceans', value: 'Oceans', source: 'IRIS' },
    { name: 'pollution', value: 'Pollution', source: 'IRIS' },
    { name: 'real-estate', value: 'Real Estate', source: 'IRIS' },
    { name: 'waste', value: 'Waste', source: 'IRIS' },
    { name: 'water', value: 'Water', source: 'IRIS' },
    { name: 'other', value: 'Other', source: 'adhoc' },
  ]);

  await categoryRepository.save(categorySeeds);

  const superAdminUser = userRepository.create({
    email: serverEmail,
    firstName: 'admin',
    password: bcrypt.hashSync(seedPassword, 12),
    confirmed: true,
    loginType: 'password',
    walletAddress: '0x324bE1Bc256e97CF9a858a37d880bCE687671215',
  });

  users.push(superAdminUser);

  const projects: Project[] = [];
  let organisations: Organisation[] = [];

  if (config.get('DEFAULT_ORGANISATION') === 'giveth') {
    const givethAdmin = userRepository.create({
      email: 'james@giveth.io',
      firstName: 'admin',
      password: bcrypt.hashSync(seedPassword, 12),
      confirmed: true,
      loginType: 'password',
      walletAddress: '0x63A32F1595a68E811496D820680B74A5ccA303c5',
    });
    users.push(givethAdmin);
    await userRepository.save(users);
    const project1 = projectRepository.create({
      title: 'Giveth - Support the future of giving',
      description: `Join us in building the future of giving!\n\nIn addition to maintaining beta.giveth.io, we’re actively developing v2.giveth.io, the free, open-source, and decentralized application for peer-to-peer donations. Donations such as yours are our primary source of funding and are deeply appreciated! 💜\n\nProgress 🚀\n\n - Giveth now has 501c3 status!\n - The beta version of Giveth is live at beta.giveth.io with free donations for projects!\n - We’re building the next evolution of Giveth at v2.giveth.io and making incredible progress. Take it for a test drive and let us know what you think!\n - We are Hiring! We are looking for experienced devs and project managers to join the team!\n\nIn the next evolution of Giveth, we're building upon firsthand experience over the past 3+ years with the Giveth Dapp. The V2 is starting out with a simple purpose:\n\nEnable projects anywhere in the world to start accepting donations in a few minutes, with zero fees and zero censorship.\n\nOffer the best experience for anyone looking to donate to a cause, whether with crypto or a credit card.\n\nCheck out the in-progress v2, and please donate to help make this dream a reality!`,
      organisationId: 1,
      giveBacks: true,
      verified: true,
      admin: 'giveth',
      walletAddress: '0x8f951903C9360345B4e1b536c7F5ae8f88A64e79',
      slug: 'giveth',
      image: projectBg,
      creationDate: '2016-01-01T00:00:00-05:00',
    });
    projects.push(project1);
    organisations = organisationRepository.create([
      {
        title: 'Giveth',
        description: 'Giveth is the future of giving.',
      },
      {
        title: 'Gaia Protection',
        description:
          'The Madre Tierra Verde Foundation aims to contribute to the transition of Costa Rican society towards a paradigm of a green and intelligent society, following the guidelines of the National Strategy for Decarbonizing the Economy, through guidance and advice to organizations, communities and governments.',
      },
    ]);
    await organisationRepository.save(organisations);
    const adminOrganisationUser = organisationUserRepository.create({
      role: 'admin',
      organisation: organisations[0],
      user: givethAdmin,
    });

    await organisationUserRepository.save(adminOrganisationUser);
  } else {
    // Organisation 1
    const co2kenAdmin = userRepository.create({
      email: 'admin@co2ken.io',
      firstName: 'CO2ken',
      password: bcrypt.hashSync(seedPassword, 12),
      confirmed: true,
      loginType: 'password',
    });
    users.push(co2kenAdmin);
    await userRepository.save(users);
    const project1 = projectRepository.create({
      title: 'Ecoera',
      description: `Become Climate Positive
      We enable the Carbon Transformation by making your organisation go climate positive using carbon removal from our sustainable biochar carbon sink.`,
      organisationId: 2,
      admin: 'ecoera',
      giveBacks: true,
      verified: true,
      walletAddress: '0x63A32F1595a68E811496D820680B74A5ccA303c5',
      slug: 'ecoera',
      image:
        'https://cdn.shopify.com/s/files/1/2556/2892/files/BiokolBigbag_3000x.JPG?v=1511514366',
    });
    const project2 = projectRepository.create({
      title: 'REDD+ Papua New Guinea',
      description: `Why only Offsett and Reduce your carbon footprint? Our Validated, Verified, and Registered Carbon Credits conserve endangered tropical rainforests in Papua New Guinea and generate historical economic growth and social transformation for its people.`,
      organisationId: 2,
      admin: 'redd',
      giveBacks: true,
      verified: true,
      walletAddress: '0x63A32F1595a68E811496D820680B74A5ccA303c5',
      slug: 'redd-papua-new-guinea',
      image: 'https://offsetra.com/agrocortex_banner.jpg',
    });
    projects.push(project1);
    projects.push(project2);

    organisations = organisationRepository.create([
      {
        title: 'CO2ken',
        description:
          'We tokenize carbon offsets to make them available for Ethereums web3 ecosystem.',
      },
      {
        title: 'Giveth',
        description: 'Giveth is the future of giving.',
      },
      {
        title: 'Gaia Protection',
        description:
          'The Madre Tierra Verde Foundation aims to contribute to the transition of Costa Rican society towards a paradigm of a green and intelligent society, following the guidelines of the National Strategy for Decarbonizing the Economy, through guidance and advice to organizations, communities and governments.',
      },
    ]);
    await organisationRepository.save(organisations);
    const adminOrganisationUser = organisationUserRepository.create({
      role: 'admin',
      organisation: organisations[0],
      user: co2kenAdmin,
    });
    await organisationUserRepository.save(adminOrganisationUser);
  }

  await projectRepository.save(projects);

  const donations = donationRepository.create({
    transactionId: '9151faa1-e69b-4a36-b959-3c4f894afb68',
    transactionNetworkId: 10,
    toWalletAddress: '134',
    fromWalletAddress: '134',
    currency: 'PolyDoge',
    anonymous: false,
    amount: 10,
    valueEth: 10,
    valueUsd: 10,
    priceEth: 10,
    priceUsd: 10,
    createdAt: new Date(),
    donationType: 'test',
    transakStatus: 'ORDER_PROCESSING',
    user: superAdminUser,
    project: projects[0],
  });

  await donationRepository.save(donations);

  // Seed join table
  // const organisationProject = organisationProjectRepository.create({
  //   organisation: testOrganizations[0],
  //   project: covidProject
  // })
  // await organisationProjectRepository.save(organisationProject)

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
    defaultUser: superAdminUser,
  };
}

export function RelationColumn(options?: ColumnOptions) {
  return Column({ nullable: true, ...options });
}
