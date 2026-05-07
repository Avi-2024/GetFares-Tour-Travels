I have a backend and it is common in 3 websites:
/get-fares/crm-frontend, /get-fares/cms-frontend, /get2vacation

I have created the backend according to the crm-frontend and now I want to update the backend according to the cms and get2vacation website.

the get2v website is ready and the data shown in the get2v website will be controlled from cms-frontend

I have created cms-schema.sql according to website. and the main-db.sql is the full db schema of everything in the project of crm.
we only have to control a few things and not full website. here is list of things which are to be controlled dynamically:

I want you to analyze the get2v website and update the schema in cms-schema.sql according to these elements to be made dynamic:

1. homepage tab in navbar > the floating 4 places in small cards (table: landing_places in crm-schema.sql)

2. destination tab in navbar (table: destinations in crm-schema.sql)

3. every destination will have some packages (https://get2vacation-in.vercel.app/destination-detail/maldives) (table: main_packages in crm-schema.sql)

4. every destination will also have a 'best time to visit' section with n cards showing different month duration (table: season_cards in crm-schema.sql)

5. every package will also have some subpackages (table: sub_packages in crm-schema.sql)

6. the images and media shown in /destination/<dest name> is also to be made dynamic so the admin can decide which videos and images to be shown in the page..

NOTE: the main_packages and sub_packages are none other than packages themselves but just to create a hierarchy we created 2 tables and refered them. so basically in terms of oops we can say that main packages and sub packages just inherits the packages table

7. now the 'visa services' tab in navbar (https://get2vacation-in.vercel.app/visa-services), there is a section titled "... Visa Destinations" and there are some cards, these cards will also be dynamic based on what is added from cms software.

so I want you to plan a most optimized schema and best architecture flow and also the screens of the cms-frontend and \*/backend/cms

write the details of architecture in a markdown file and update the schema queries direct in cms-schema.sql.

the packages table is also used in the crm software, also analyze the crm backend and plan a proper architecture accordingly so the crm doesnt break while updating the packages for cms.

also if very necessary, tell me I will update the backend for crm for new package schema architecture
