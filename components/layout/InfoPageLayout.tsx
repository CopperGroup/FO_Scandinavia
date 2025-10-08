// Приклад InfoPageLayout.tsx (Спрощений)
"use client"
import React from 'react';
import ReactMarkdown from 'react-markdown'; // Потрібно встановити: npm install react-markdown

interface InfoPageLayoutProps {
  title: string;
  markdownContent: string;
}

const InfoPageLayout: React.FC<InfoPageLayoutProps> = ({ title, markdownContent }) => {
  return (
    <div className="container mx-auto px-4 py-8 lg:py-16">
      <h1 className="text-3xl lg:text-4xl font-bold mb-8 text-[#006AA7]">{title}</h1>
      <div className="prose max-w-none text-gray-700">
        <ReactMarkdown>{markdownContent}</ReactMarkdown>
        {/* Або використання dangerouslySetInnerHTML, якщо ви використовуєте інший парсер:
        <div dangerouslySetInnerHTML={{ __html: your_html_content_from_parser }} />
        */}
      </div>
    </div>
  );
};

export default InfoPageLayout;