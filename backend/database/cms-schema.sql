-- / FLOATING CARDS ON LANDING PAGE /
create table landing_places {
    id uuid primary key default gen_random_uuid()
    name varchar(100) not null,
    desc varchar(200) not null,
    image text not null,
    active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
}

-- CREATE TABLE destinations (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     name VARCHAR(150) UNIQUE NOT NULL,
--     country VARCHAR(100),
--     is_active BOOLEAN DEFAULT TRUE,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

create table destinations {
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) UNIQUE NOT NULL,
    desc VARCHAR(200) NOT NULL,
    rating float default 0.0,
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at timestampz default now(),
    updated_at timestamptz default now()
    image text not null
}

create table season_cards (
    id int primary key auto_increment,
    title varchar(100) not null,
    from_month varchar(20) not null,
    to_month varchar(20) not null,
    destination uuid references destinations(id),
    description text not null,
    tag varchar(50) not null,
    icon_name varchar(50),
    icon_color varchar(20),
    display_order int default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
);

create table featured_hot_picks (
    id int primary key auto_increment,
    title varchar(150) not null,
    subtitle varchar(150),
    country varchar(100) not null,
    category enum('package', 'visa_service') not null,
    rating decimal(2,1) default 0.0,
    badge_text varchar(100),
    original_price decimal(10,2),
    discounted_price decimal(10,2) not null,
    duration varchar(100),
    flights_included boolean default false,
    processing_time varchar(100),
    description text,
    image_url text not null,
    button_text varchar(50) default 'book now',
    display_order int default 0,
    is_active boolean default true,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
);

CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    destination VARCHAR(120) NOT NULL,
    duration VARCHAR(30),
    starting_price NUMERIC(12,2) DEFAULT 0 CHECK (starting_price >= 0),
    -- inclusions TEXT,
    -- exclusions TEXT,
    -- itinerary JSONB,
    -- hotel_details TEXT,
    valid_from DATE,
    valid_to DATE,
    -- cancellation_policy TEXT,
    -- package_category VARCHAR(30),
    -- status VARCHAR(20) DEFAULT 'DRAFT',
    banner_image_url TEXT,
    gallery_image_urls TEXT[],
    meta_title VARCHAR(180),
    meta_description TEXT,
    -- keywords TEXT,
    publish_to_website BOOLEAN DEFAULT FALSE,
    -- website_slug VARCHAR(180) UNIQUE,
    -- website_last_synced_at TIMESTAMP,
    is_sold_out BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table main_packages {
    id uuid primary key default gen_random_uuid(),
    package_id uuid references packages(id),
    created_at timestampz default now(),
    updated_at timestampz default now()
}

create table destination_package_map {
    id uuid primary key default gen_random_uuid(),
    destination_id uuid references destinations(id) on delete cascade,
    package_id uuid references main_packages(id),
    created_at timestampz default now(),
    updated_at timestampz default now()
}

create table subpackages {
    id uuid primary key default gen_random_uuid(),
    main_package_id uuid references main_packages(id),
    package_id uuid references packages(id),
    created_at timestampz default now(),
    updated_at timestampz default now()
}

