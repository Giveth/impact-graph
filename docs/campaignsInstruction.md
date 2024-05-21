## Campaign Fields
* `title`: **Required**, This is something that we show in frontend like **GIVpower is here!** text in below image
<img width="1438" alt="Screen Shot 1402-01-07 at 12 10 08" src="https://user-images.githubusercontent.com/9850545/227888868-dd2d15ed-538f-4c15-9894-e0e02e939da9.png">

* `slug`:**Required**, This should be a string that contains a-z,_,- , 0-9 and please don't use spaces or special characters in that, because we use slug in the link of campaign if we want to go to the campaign link directly
*  `type`:**Required**, it can be one of
    * `ManuallySelected`: In these type of projects we pick some projects to show them in campaign, for instance for Turkey earthquake we pick some projects. so we just need to add slug of those projects in `Related Projects Slugs` and in what order we add them they will be shown in frontend <img width="1124" alt="Screen Shot 1402-01-07 at 12 18 26" src="https://user-images.githubusercontent.com/9850545/227890938-c6daba71-2301-4d55-9110-d2b13e0e2c26.png">


    *  `SortField`:  Sometimes in a campaign we just want to show projects in a specified order, for instance we can create a campaign like ** Check projects that received most likes** so for this campaign you set **SortField** as campaign type and then you can use one of below sorting fields <img width="1118" alt="Screen Shot 1402-01-07 at 12 26 50" src="https://user-images.githubusercontent.com/9850545/227893144-e5455281-b2b3-4cfa-8d8e-e61f7dfd78a8.png">

    * `FilterFields`: Sometimes we need to filter some projects in a campaign, for instance **Let's choose verified projects that accept funds on Gnosis chain**, for this we can Add `verified` and `acceptFundOnGnosis` filters <img width="1108" alt="Screen Shot 1402-01-07 at 12 40 50" src="https://user-images.githubusercontent.com/9850545/227896978-f5820a20-5727-42c3-a209-9d43b1ede865.png">

    * `WithoutProjects`: Some campaigns don't include any project in them and they are just some banner like **Feeling $nice?** campaign in below image <img width="1367" alt="Screen Shot 1402-01-07 at 12 43 48" src="https://user-images.githubusercontent.com/9850545/227897739-5de5fba1-d1ab-47da-849c-7c02c1909884.png">

* `Is Active`:**Optional**, if you check it, it will appear in frontend otherwise it seems you deleted/archived this campaign and users would not see it
* `Is New`: **Optional**, @MohammadPCh  Can you help me and tell me what's the usage of this field in frontend?
* `Is Featured`:**Optional**, @MohammadPCh  Can you help me and tell me what's the usage of this field in frontend?
* `Description`:**Required**, Write down something about campaign and we show it like **Donate eligible tokens to Giveth and receive $nice, redeemable for swag and much more!** text in below image <img width="1398" alt="Screen Shot 1402-01-07 at 12 52 33" src="https://user-images.githubusercontent.com/9850545/227899963-3018793e-9a1f-4fab-8689-63c91ab28df1.png">
* `Hashtags`:**Optional**, @MohammadPCh  I guess frontend doesn't use it anymore, am I right?
*  `Related Projects Slugs` : It's just **Required** for campaigns with type `ManuallySelected`, I already explained it above in **type** section
* `Photo`: **Optional**, This is the image link that we show in campaign banner, first you need to upload image in pinata and use that link in here, for instance for below campaign this is the value of photo https://giveth.mypinata.cloud/ipfs/QmYR3KLnsRKiibuS5oBRLnyaLM7Sv1QcbBEAPN1DD6d7UP/Nice%20token@2x.png <img width="1405" alt="Screen Shot 1402-01-07 at 13 00 39" src="https://user-images.githubusercontent.com/9850545/227902144-f16b6575-b875-4895-a1e7-f5a235e57e27.png">
* `Video`:**Optional**,  Some campaigns use video instead of image in banner, like photo first we need to upload it somewhere and then put it here, campaign example  <img width="1396" alt="Screen Shot 1402-01-07 at 13 08 27" src="https://user-images.githubusercontent.com/9850545/227904246-1301b526-41ba-4ec7-85ac-9218a1056402.png">
* `Video Preview`:**Optional**,  There is an image like above one that we show for video before playing, so if you fill `Video` it's required to put an image link here to show that as video's preview
* ‍`Order`: If you want to show a campaign before others please fill order for it ( we show 1 after that 2, ..) and after those campaigns we show campaigns without orders sorted by created date descending
* `Landing Link`: **Optional**,  Sometime we want to redirect user to an external link when click on **Explore** in campaign card, it happens for campaigns that have **WithoutProject** type because other campaigns usually redirect user to a project list page, in case of you want to redirect to an external link, please fill this field
* `Filter Fields`:  It's just **Required** for campaigns with type `FilterFields`, I already explained it above in **type** section
* `Sorting Field`:  It's just **Required** for campaigns with type `SortField`, I already explained it above in **type** section
