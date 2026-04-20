import React from 'react';
import './PdfTemplate.css';
import { GiPalmTree } from 'react-icons/gi';
import { FaHotel, FaPlane, FaCar, FaShieldVirus } from 'react-icons/fa6';


interface ItineraryDay {
    title: string;
    points: string[];
}

interface PdfTemplateProps {
    data: {
        packageName: string;
        email: string;
        leadId: string;
        guestName: string;
        guestEmail: string;
        nights: number;
        adults: number;
        children?: number;
        travelDate?: string | null;
        validUntil?: string | null;
        total: string;
        totalSellValue?: string;
        itinerary: ItineraryDay[];
        destination?: string;
        quotationTitle?: string;
        templateName?: string;
        packageType?: string;
        inclusions?: string;
    };
}

const PdfTemplate: React.FC<PdfTemplateProps> = ({ data }) => {
    // Parse inclusions from string
    const parseInclusions = (inclusionsText: string | undefined): string[] => {
        if (!inclusionsText) return [];
        return inclusionsText
            .split('\n')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    };

    // Get icon based on service name
    const getServiceIcon = (service: string) => {
        const lowerService = service.toLowerCase();
        
        // Check for Transfer/Land Arrangement/Local Transfer/Airport (BEFORE flights check)
        if (
            lowerService.includes('transfer') ||
            lowerService.includes('airport') ||
            lowerService.includes('land arrangement') ||
            lowerService.includes('local transfer')
        ) {
            return <FaCar className="icon" />;
        }
        
        // Check for Flights
        if (
            lowerService.includes('flight') ||
            lowerService.includes('air ticket') ||
            lowerService.includes('air')
        ) {
            return <FaPlane className="icon" />;
        }
        
        // Check for Hotel/Accommodation
        if (
            lowerService.includes('hotel') ||
            lowerService.includes('accommodation') ||
            lowerService.includes('room') ||
            lowerService.includes('stay')
        ) {
            return <FaHotel className="icon" />;
        }
        
        // Check for Tours & Activities
        if (
            lowerService.includes('tour') ||
            lowerService.includes('activity') ||
            lowerService.includes('excursion')
        ) {
            return <GiPalmTree className="icon" />;
        }
        
        // Check for Insurance (but not Land Arrangement)
        if (
            lowerService.includes('insurance') &&
            !lowerService.includes('land arrangement')
        ) {
            return <FaShieldVirus className="icon" />;
        }
        
        return <GiPalmTree className="icon" />;
    };

    const inclusionsList = parseInclusions(data.inclusions);
    return (
        <div className="pdf-container" id="pdf-content">
            {/* TOP HEADER */}
            <div className="top-header">
                <div className="logo-row">
                    <img src="/logo1.png" className="logo-icon" alt="Get2Vacations" />
                    <div className='Get2Vacations'>
                        <h1>Get2<span className='Vacations'>Vacations</span></h1>
                        <span className='headingpara'>Smart Routes, Better Destinations.</span>
                    </div>
                </div>
            </div>

            {/* BANNER */}
            <img src="/banner.png" className="banner" alt="Banner" />

            {/* PACKAGE SECTION */}
            <div className="package-section">
                <div>
                    <h3>PACKAGE NAME :-</h3>
                    <p>{data.packageName}</p>
                    <strong>Guest Email: {data.email}</strong>
                    {data.packageType && (
                        <p className="package-type">
                            <b>Package Type :   {data.packageType}    </b>
                        </p>
                    )}
                </div>
                <div>
                    <p>
                        <b>LEAD ID :</b> {data.leadId}
                    </p>
                </div>
            </div>

            {/* GUEST CARD */}
            <div className="guest-card">
                <div>
                    <b className='guest-name'>Guest Name :- <span >{data.guestName}</span></b>
                    <p>Guest Email :- {data.guestEmail}</p>
                    <p>
                        <b>Travel Date:</b> {data.travelDate || 'N/A'}
                    </p>
                </div>

                <div className="right">
                    <p>Destination  : {data.destination || 'N/A'}</p>
                    <p>
                        {data.nights} nights - {data.adults} adults
                        {data.children && data.children > 0 ? ` - ${data.children} child${data.children !== 1 ? 'ren' : ''}` : ''}
                    </p>
                    <p>
                        <b>Valid Until: {data.validUntil || 'N/A'}</b>
                    </p>
                </div>
            </div>

            {/* SERVICES */}
            <p className='service-title'>Included Services</p>
            <div className="services-box">
                {inclusionsList.length > 0 ? (
                    inclusionsList.map((service, index) => (
                        <div key={index} className="service">
                            {getServiceIcon(service)}
                            <p>{service}</p>
                        </div>
                    ))
                ) : (
                    <div className="no-services">
                        <p>No services included</p>
                    </div>
                )}
            </div>

            {/* ITINERARY */}
            <div className="itinerary-box">

                <div className="itinerary-header">
                    ITINERARY SNAPSHOT
                </div>

                {data.itinerary.map((day, index) => (
                    <div key={index} className="itinerary-row">

                        {/* LEFT SIDE */}
                        <div className="left">
                            {day.title}
                        </div>

                        {/* RIGHT SIDE */}
                        <div className="right">
                            {day.points.map((point, i) => (
                                <p key={i}>{i + 1}. {point}</p>
                            ))}
                        </div>

                    </div>
                ))}

            </div>

            {/* PRICE */}
            <div className="price-box">
                <p>Package Fees</p>
                <div className="price-row">
                    <b>Total Sale Value</b>
                    <span>₹ {data.totalSellValue || data.total}</span>
                </div>
            </div>

            {/* FOOTER */}
            <div className="footer">
                <div> <p className="success">Preview validated and ready to share.</p>

                    <div className="socials">
                        <img src='/insta.png' alt="Instagram" />
                        <img src='/fb.jpg' alt="Facebook" />
                        <img src='/x.png' alt="X" />
                    </div>
                </div>

                <p className='email'>{data.email}</p>
            </div>
        </div>
    );
};

export default PdfTemplate;
