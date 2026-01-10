import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';

const Breadcrumb = ({ items }) => {
    const location = useLocation();

    // Auto-generate breadcrumbs from path if items not provided
    const generateBreadcrumbs = () => {
        if (items) return items;

        const pathParts = location.pathname.split('/').filter(Boolean);
        return pathParts.map((part, index) => ({
            label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
            path: '/' + pathParts.slice(0, index + 1).join('/'),
            isLast: index === pathParts.length - 1,
        }));
    };

    const breadcrumbs = generateBreadcrumbs();

    return (
        <nav className="flex items-center gap-2 text-sm text-secondary-500 mb-4">
            <Link
                to="/"
                className="flex items-center gap-1 hover:text-primary-600 transition-colors"
            >
                <FiHome size={16} />
            </Link>
            {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                    <FiChevronRight size={14} className="text-secondary-400" />
                    {item.isLast || index === breadcrumbs.length - 1 ? (
                        <span className="text-secondary-700 font-medium">{item.label}</span>
                    ) : (
                        <Link
                            to={item.path}
                            className="hover:text-primary-600 transition-colors"
                        >
                            {item.label}
                        </Link>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumb;
