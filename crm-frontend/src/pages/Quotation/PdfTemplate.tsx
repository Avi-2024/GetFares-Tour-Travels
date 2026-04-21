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
        leadId?: string; // Top-level UUID
        // templateSnapshot?: {
        //     lead?: {
        //         leadId?: string; // User-friendly code like "A0A0A2"
        //     };
        // };
        guestName: string;
        guestEmail: string;
        nights: number;
        adults: number;
        children?: number;
        travelDate?: string | null;
        validUntil?: string | null;
        total: string;
        totalSellValue?: string;
        currency?: string;
        itinerary: ItineraryDay[];
        destination?: string;
        quotationTitle?: string;
        templateName?: string;
        packageType?: string;
        inclusions?: string;
        exclusions?: string;
        headerBranding?: string;
        paymentTerms?: string;
        cancellationPolicy?: string;
        footerDisclaimer?: string;
        hotelDetails?: string;
        quoteReference?: string;
        quotationStatus?: string;
        supplierName?: string;
        enabledServices?: string;
    };
}

const PdfTemplate: React.FC<PdfTemplateProps> = ({ data }) => {
    const currency = String(data.currency || 'INR').toUpperCase();

    const parseAmount = (value: unknown) => {
        if (typeof value === 'number') return value;
        const raw = String(value ?? '').trim();
        if (!raw) return 0;
        const normalized = raw.replace(/[^\d.-]/g, '');
        const n = Number(normalized);
        return Number.isFinite(n) ? n : 0;
    };

    const formatMoney = (amount: unknown, currencyCode: string) => {
        const normalized = String(currencyCode || 'INR').toUpperCase();
        const locale = normalized === 'INR' ? 'en-IN' : 'en-US';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: normalized,
            maximumFractionDigits: 2,
        }).format(parseAmount(amount));
    };

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
    const exclusionsList = parseInclusions(data.exclusions);
    const enabledServicesList = parseInclusions(data.enabledServices);

    const section = (title: string, value?: string) => {
        const text = String(value ?? '').trim();
        if (!text) return null;
        return (
            <div className="pdf-section">
                <div className="pdf-section-title">{title}</div>
                <div className="pdf-section-body">{text}</div>
            </div>
        );
    };
    return (
        <div className="pdf-document" id="pdf-content">
            <div className="pdf-page pdf-page-1">
                <div className="pdf-content">
                    {/* Header is part of background design (`quotation_design.png`). */}

                    {/* BANNER */}
                    <img src="/banner.jpeg" className="banner" alt="Banner" />

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
                                <b>LEAD ID :</b> {data.leadId || 'N/A'}
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
                    {/* INCLUDED SERVICES */}
                    <div className="pdf-block">
                        <div className="pdf-block-title">Included Services</div>
                        <div className="pdf-block-body">
                            {inclusionsList.length > 0 ? (
                                <div className="pdf-services-grid">
                                    {inclusionsList.map((service, index) => (
                                        <div key={index} className="pdf-service">
                                            <span className="pdf-service-icon">{getServiceIcon(service)}</span>
                                            <span className="pdf-service-text">{service}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="pdf-muted">No services included</div>
                            )}
                        </div>
                    </div>

                    {/* PRICE */}
                    <div className="price-box">
                        <p>Package</p>
                        <div className='price-header'>
                            <p>Service Charge</p>
                            <span>{formatMoney(data.totalSellValue ?? data.total, currency)}</span>
                        </div>

                        <div className="price-row">
                            <b>Total Value</b>
                            <span>{formatMoney(data.totalSellValue ?? data.total, currency)}</span>
                        </div>
                    </div>




                </div>
            </div>

            <div className="pdf-page pdf-page-2">
                <div className="pdf-content">
                    <div className="pdf-page-title">Quotation Content</div>

                    <div className="pdf-page-grid">
                        <div className="pdf-col">
                            <div className="pdf-block">
                                <div className="pdf-block-title">Itinerary Snapshot</div>
                                <div className="pdf-block-body">
                                    {data.itinerary.length ? (
                                        data.itinerary.map((day, index) => (
                                            <div key={index} className="pdf-itinerary-day">
                                                <div className="pdf-itinerary-day-title">{day.title}</div>
                                                {day.points.map((point, i) => (
                                                    <div key={i} className="pdf-itinerary-point">
                                                        {point}
                                                    </div>
                                                ))}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="pdf-muted">No itinerary added.</div>
                                    )}
                                </div>
                            </div>

                            <div className="pdf-block">
                                <div className="pdf-block-title">Inclusions</div>
                                <div className="pdf-block-body">
                                    {inclusionsList.length ? (
                                        <ul className="pdf-list">
                                            {inclusionsList.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="pdf-muted">-</div>
                                    )}
                                </div>
                            </div>

                            <div className="pdf-block">
                                <div className="pdf-block-title">Exclusions</div>
                                <div className="pdf-block-body">
                                    {exclusionsList.length ? (
                                        <ul className="pdf-list">
                                            {exclusionsList.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="pdf-muted">-</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pdf-col">
                            {/* <div className="pdf-block">
                                <div className="pdf-block-title">Included Services</div>
                                <div className="pdf-block-body">
                                    {inclusionsList.length > 0 ? (
                                        <div className="pdf-services-grid">
                                            {inclusionsList.map((service, index) => (
                                                <div key={index} className="pdf-service">
                                                    <span className="pdf-service-icon">{getServiceIcon(service)}</span>
                                                    <span className="pdf-service-text">{service}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="pdf-muted">No services included</div>
                                    )}
                                </div>
                            </div> */}

                            {section('Header Branding', data.headerBranding)}
                            {section('Payment Terms', data.paymentTerms)}
                            {section('Cancellation Policy', data.cancellationPolicy)}
                            {section('Footer Disclaimer', data.footerDisclaimer)}
                            {section('Hotel Details', data.hotelDetails)}

                            <div className="pdf-block">
                                <div className="pdf-block-title">Trip Summary</div>
                                <div className="pdf-block-body">
                                    <div className="pdf-kv"><b>Quote Reference:</b> {data.quoteReference || 'N/A'}</div>
                                    <div className="pdf-kv"><b>Quotation Title:</b> {data.quotationTitle || 'N/A'}</div>
                                    <div className="pdf-kv"><b>Version:</b> {data.quotationStatus || 'N/A'}</div>
                                    <div className="pdf-kv"><b>Destination:</b> {data.destination || 'N/A'}</div>
                                    <div className="pdf-kv"><b>Travel Date:</b> {data.travelDate || 'N/A'}</div>
                                    <div className="pdf-kv"><b>Nights:</b> {String(data.nights ?? '')}</div>
                                    <div className="pdf-kv"><b>Adults:</b> {String(data.adults ?? '')}</div>
                                    <div className="pdf-kv"><b>Children:</b> {String(data.children ?? 0)}</div>
                                    <div className="pdf-kv"><b>Package Type:</b> {data.packageType || 'N/A'}</div>
                                    <div className="pdf-kv"><b>Supplier:</b> {data.supplierName || 'N/A'}</div>
                                </div>
                            </div>

                            <div className="pdf-block">
                                <div className="pdf-block-title">Enabled Services</div>
                                <div className="pdf-block-body">
                                    {enabledServicesList.length ? (
                                        <ul className="pdf-list">
                                            {enabledServicesList.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="pdf-muted">-</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PdfTemplate;
