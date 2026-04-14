1. DESTINATIONS

```txt
    - season focus - dropdown of all seasons
    - short description - text
    - description - text
    - country - choosen from dropdown
    - category - text (choosen from dropdown [all, honeymoon, family, adventure, cultural])
    - do not add labels like 'Featured / Popular' use only 1 value without '/'
    - title image and gallery are 2 different things, title image is the one which will show in card of destination and gallery will be shown when we go into destination detailed view page.
    - key highlights : (list of key highlights and can be added more by clicking on [+add] button). add button will add a new row in the list and the row will be nth but a field where we can add a highlight text.
    - services : same as key highlights but with only 2 fields {title, description}
    - best time to visit : same as key highlight but instead of 1 field row, there will be following details in 1 new added row/card {icon_name, color (hex), title, duration : {from, to}, description, suggestion }

    add the rest things whatever needed for seo and all

```

2. MAIN PACKAGES

```txt
    - title
    - amount
    - destination : id of saved destination (choose from dropdown)
    - features : similar to key highlights in destionations but with 2 fields {icon_name, description}
    - includions : same again a list of includions but they will be multiple choose options, among a grid of options we can choose some, all or none. schema: {icon_name, description}

    add the rest things whatever needed for seo and all
```

3. SUB PACKAGES

```txt
    - image
    - main_package : id of saved main packages (choose from dropdown)
    - rating (will be calculated based on user interaction from other backend so just keep a field for now in database and default it to 0)
    - location
    - title
    - duration { days, nights} (eg: {2,1})
    - starting_price
    - transport : text
    - description : text
    - snapshot : text
    - features : list of {title, description}
    - itenaries : same as the key highlights from destination with add button and new row is added with fields {day (day number is auto added based on the index of added row), title, description, features (list of {title, description}) }
    - highlights : List<string>
    - includions : List<string>
    - excludions : List<string>
    - payment_terms : List<string>
    - canceletion_policy : List<string>
    - tnc : List<string>
    - imp_notes : List<string>

    List<string> => add button to add new row and each row is a text field and they are just

    add the rest things whatever needed for seo and all
```

# NOTE: the packages are also used in crm backend and crm-frontend. So i want you to run a deep analysis of where and how the packages are used in crm cause the crm is fully functional and I dont want to break anything there. Above mentioned are all fields that I manually typed by looking at the get2vacation website webpages, so I need you to make the cms ui how I mentioned above. The packages, main packages, sub packages tables will shrinken to 2 tables (main and sub packages) only main and sub packages will have create package modal and packages table will only show the combined packages (main + sub) and can be editted, deleted and viewed but not created from there. creation will only be in main package and sub package.
