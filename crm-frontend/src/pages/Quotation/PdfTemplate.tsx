import React from 'react';
import './PdfTemplate.css';
import {
    FaPlaneDeparture,
    FaHotel,
    FaCarSide,
    FaShieldAlt,
    FaMapMarkedAlt,
    FaTag,
} from 'react-icons/fa';


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
        /** Hides holiday-only blocks; shows payment/cancellation and pricing-focused PDF. */
        visaLeadQuotation?: boolean;
    };
}

interface PostSectionItem {
    key: string;
    units: number;
    node: React.ReactNode;
}

const PdfTemplate: React.FC<PdfTemplateProps> = ({ data }) => {
    const visaMode = Boolean(data.visaLeadQuotation);
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
        const items = inclusionsText
            .split('\n')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
        const seen = new Set<string>();
        return items.filter((item) => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const normalizeServiceLabel = (service: string) =>
        String(service || '')
            .replace(/^[\s.\-•]+/, '')
            .replace(/[:;,.\s]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();

    // Get icon based on service name
    const getServiceIcon = (service: string) => {
        const lowerService = normalizeServiceLabel(service).toLowerCase();

        // Check for Transfer/Land Arrangement/Local Transfer/Airport (BEFORE flights check)
        if (
            lowerService.includes('transfer') ||
            lowerService.includes('airport') ||
            lowerService.includes('land arrangement') ||
            lowerService.includes('local transfer')
        ) {
            return <FaCarSide className="icon" />;
        }

        // Check for Flights
        if (
            lowerService.includes('flight') ||
            lowerService.includes('air ticket') ||
            lowerService.includes('air')
        ) {
            return <FaPlaneDeparture className="icon" />;
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
            lowerService.includes('excursion') ||
            lowerService.includes('sightseeing')
        ) {
            return <FaMapMarkedAlt className="icon" />;
        }

        if (
            lowerService.includes('insurance') &&
            !lowerService.includes('land arrangement')
        ) {
            return <FaShieldAlt className="icon" />;
        }
        return <FaTag className="icon" />;
    };

    const inclusionsList = parseInclusions(data.inclusions);
    const exclusionsList = parseInclusions(data.exclusions);
    const enabledServicesList = parseInclusions(data.enabledServices);
    const pageOneServiceSource = visaMode ? enabledServicesList : inclusionsList;
    const PAGE_ONE_SERVICE_LIMIT = 10;
    const pageOneServices = pageOneServiceSource.slice(0, PAGE_ONE_SERVICE_LIMIT);
    const overflowServices = pageOneServiceSource.slice(PAGE_ONE_SERVICE_LIMIT);

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

    const estimateItineraryWeight = (day: ItineraryDay) => {
        const titleWeight = 1;
        const pointsWeight = (day.points || []).reduce((sum, point) => {
            const len = String(point || '').trim().length;
            return sum + Math.max(1, Math.ceil(len / 150));
        }, 0);
        return titleWeight + pointsWeight;
    };

    const paginateItinerary = (days: ItineraryDay[], maxUnitsPerPage: number) => {
        const pages: ItineraryDay[][] = [];
        let current: ItineraryDay[] = [];
        let used = 0;

        days.forEach((day) => {
            const weight = estimateItineraryWeight(day);
            if (current.length > 0 && used + weight > maxUnitsPerPage) {
                pages.push(current);
                current = [];
                used = 0;
            }
            current.push(day);
            used += weight;
        });

        if (current.length > 0) pages.push(current);
        return pages;
    };

    const chunkByUnits = <T,>(items: T[], getUnits: (item: T) => number, maxUnitsPerPage: number): T[][] => {
        const pages: T[][] = [];
        let current: T[] = [];
        let used = 0;
        items.forEach((item) => {
            const weight = Math.max(1, getUnits(item));
            if (current.length > 0 && used + weight > maxUnitsPerPage) {
                pages.push(current);
                current = [];
                used = 0;
            }
            current.push(item);
            used += weight;
        });
        if (current.length > 0) pages.push(current);
        return pages;
    };

    // First continuation page can hold more than initial page because it contains only itinerary.
    const itineraryPages = !visaMode ? paginateItinerary(data.itinerary || [], 13) : [];
    const primaryItinerary = itineraryPages[0] || [];
    const extraItineraryPages = itineraryPages.slice(1);
    const hasOverflowItinerary = extraItineraryPages.length > 0;

    const getListUnits = (items: string[]) =>
        Math.max(
            2,
            1 +
                items.length +
                items.reduce((sum, item) => sum + Math.ceil(String(item || '').length / 260), 0),
        );

    const createListBlock = (key: string, title: string, items: string[]): PostSectionItem => ({
        key,
        units: getListUnits(items),
        node: (
            <div className="pdf-block" key={key}>
                <div className="pdf-block-title">{title}</div>
                <div className="pdf-block-body">
                    {items.length ? (
                        <ul className="pdf-list">
                            {items.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    ) : (
                        <div className="pdf-muted">-</div>
                    )}
                </div>
            </div>
        ),
    });

    const createTextBlock = (key: string, title: string, value?: string, enabled = true): PostSectionItem | null => {
        if (!enabled) return null;
        const text = String(value ?? '').trim();
        if (!text) return null;
        return {
            key,
            units: Math.max(2, 2 + Math.ceil(text.length / 300)),
            node: section(title, value),
        };
    };

    const serviceGroupNode = !visaMode ? (
        <>
            {createListBlock('inclusions', 'Inclusions', inclusionsList).node}
            {createListBlock('exclusions', 'Exclusions', exclusionsList).node}
            {createListBlock('enabled-services', 'Enabled Services', enabledServicesList).node}
        </>
    ) : (
        <>
            {createListBlock('inclusions', 'Inclusions', inclusionsList).node}
            {createListBlock('exclusions', 'Exclusions', exclusionsList).node}
        </>
    );

    const serviceGroupUnits = !visaMode
        ? getListUnits(inclusionsList) + getListUnits(exclusionsList) + getListUnits(enabledServicesList)
        : getListUnits(inclusionsList) + getListUnits(exclusionsList);

    const postSectionItems: PostSectionItem[] = [
        {
            key: 'service-group',
            units: serviceGroupUnits,
            node: <div key="service-group">{serviceGroupNode}</div>,
        },
        overflowServices.length > 0
            ? createListBlock(
                'services-overflow',
                visaMode ? 'Services (Continued)' : 'Included Services (Continued)',
                overflowServices,
            )
            : null,
        createTextBlock('header-branding', 'Header Branding', data.headerBranding, !visaMode),
        createTextBlock('payment-terms', 'Payment Terms', data.paymentTerms),
        createTextBlock('cancellation-policy', 'Cancellation Policy', data.cancellationPolicy),
        createTextBlock('footer-disclaimer', 'Footer Disclaimer', data.footerDisclaimer, !visaMode),
        createTextBlock('hotel-details', 'Hotel Details', data.hotelDetails, !visaMode),
    ].filter((item): item is PostSectionItem => Boolean(item && item.node));

    const postSectionPages = chunkByUnits(postSectionItems, (item) => item.units, hasOverflowItinerary ? 22 : 20);

    const renderPostItinerarySections = (pageItems: PostSectionItem[] = postSectionItems) => (
        <div className="pdf-page-stack">
            {pageItems.map((item) => item.node)}
        </div>
    );

    return (
        <div className="pdf-document" id="pdf-content">
            <div className="pdf-page pdf-page-1">
                <div className="pdf-content">
                    {/* Header is part of background design (`quotation_design.png`). */}

                    {/* BANNER */}
                    <img src="/banner.jpeg" className="banner" alt="Banner" />

                    {/* PACKAGE SECTION */}
                    <div className="package-section">
                        <div className="meta-stack">
                            <h3>
                                <span className="meta-label">{visaMode ? 'Quotation' : 'Package Name'}:</span>
                                <span className="meta-value">{data.packageName}</span>
                            </h3>
                            <p className="meta-line">
                                <span className="meta-label">Guest Email:</span>
                                <span className="meta-value">{data.email}</span>
                            </p>
                            {data.packageType && (
                                <p className="meta-line">
                                    <span className="meta-label">Package Type:</span>
                                    <span className="meta-value">{data.packageType}</span>
                                </p>
                            )}
                        </div>
                        <div className="meta-right">
                            <p className="meta-line">
                                <span className="meta-label">Lead ID:</span>
                                <span className="meta-value">{data.leadId || 'N/A'}</span>
                            </p>
                        </div>
                    </div>

                    {/* GUEST CARD */}
                    <div className="guest-card">
                        <div>
                            <b className='guest-name'>Guest Name: <span>{data.guestName}</span></b>
                            <p><span className="guest-label">Guest Email:</span> {data.guestEmail}</p>
                            <p>
                                <b>Travel Date:</b> {data.travelDate || 'N/A'}
                            </p>
                        </div>

                        <div className="right">
                            <p><span className="guest-label">Destination:</span> {data.destination || 'N/A'}</p>
                            <p>
                                {data.nights} nights - {data.adults} adults
                                {data.children && data.children > 0 ? ` - ${data.children} child${data.children !== 1 ? 'ren' : ''}` : ''}
                            </p>
                            <p>
                                <b>Valid Until: {data.validUntil || 'N/A'}</b>
                            </p>
                        </div>
                    </div>
                    {/* INCLUDED SERVICES (holiday); visa mode uses enabledServices lines */}
                    <div className="pdf-block">
                        <div className="pdf-block-title">{visaMode ? 'Services' : 'Included Services'}</div>
                        <div className="pdf-block-body">
                            {visaMode ? (
                                pageOneServices.length > 0 ? (
                                    <div className="pdf-services-grid">
                                        {pageOneServices.map((service, index) => (
                                            <div key={index} className="pdf-service">
                                                <span className="pdf-service-icon">{getServiceIcon(service)}</span>
                                                <span className="pdf-service-text">{normalizeServiceLabel(service)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="pdf-muted">Insurance and visa service lines</div>
                                )
                            ) : pageOneServices.length > 0 ? (
                                <div className="pdf-services-grid">
                                    {pageOneServices.map((service, index) => (
                                        <div key={index} className="pdf-service">
                                            <span className="pdf-service-icon">{getServiceIcon(service)}</span>
                                            <span className="pdf-service-text">{normalizeServiceLabel(service)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="pdf-muted">No services included</div>
                            )}
                            {overflowServices.length > 0 ? (
                                <div className="pdf-muted" style={{ marginTop: 8 }}>
                                    +{overflowServices.length} more service item(s) moved to next page
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* PRICE */}
                    <div className="price-box">
                        <div className="price-row">
                            <b>Package Cost</b>
                            <span>{formatMoney(data.totalSellValue ?? data.total, currency)}</span>
                        </div>
                    </div>




                </div>
            </div>

            <div className="pdf-page pdf-page-2">
                <div className="pdf-content">
                    <div className="pdf-page-title">Quotation Content</div>

                    {!visaMode ? (
                        <div className="pdf-block itinerary-block-full">
                            <div className="pdf-block-title">Itinerary Snapshot</div>
                            <div className="pdf-block-body">
                                {primaryItinerary.length ? (
                                    primaryItinerary.map((day, index) => (
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
                    ) : null}

                    {!hasOverflowItinerary ? renderPostItinerarySections(postSectionPages[0] || []) : null}
                </div>
            </div>

            {!visaMode && extraItineraryPages.map((pageItems, pageIndex) => (
                <div className="pdf-page pdf-page-continued pdf-page-itinerary" key={`itinerary-page-${pageIndex + 2}`}>
                    <div className="pdf-content">
                        <div className="pdf-page-title">Quotation Content (Continued)</div>
                        <div className="pdf-block itinerary-block-full">
                            <div className="pdf-block-title">Itinerary Snapshot</div>
                            <div className="pdf-block-body">
                                {pageItems.map((day, index) => (
                                    <div key={`${pageIndex}-${index}`} className="pdf-itinerary-day">
                                        <div className="pdf-itinerary-day-title">{day.title}</div>
                                        {day.points.map((point, i) => (
                                            <div key={i} className="pdf-itinerary-point">
                                                {point}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {hasOverflowItinerary
                ? postSectionPages.map((pageItems, index) => (
                    <div className="pdf-page pdf-page-continued pdf-page-post" key={`post-itinerary-page-${index + 1}`}>
                        <div className="pdf-content">
                            <div className="pdf-page-title">Quotation Content</div>
                            {renderPostItinerarySections(pageItems)}
                        </div>
                    </div>
                ))
                : postSectionPages.slice(1).map((pageItems, index) => (
                    <div className="pdf-page pdf-page-continued pdf-page-post" key={`post-itinerary-overflow-page-${index + 1}`}>
                        <div className="pdf-content">
                            <div className="pdf-page-title">Quotation Content (Continued)</div>
                            {renderPostItinerarySections(pageItems)}
                        </div>
                    </div>
                ))}
        </div>
    );
};

export default PdfTemplate;
