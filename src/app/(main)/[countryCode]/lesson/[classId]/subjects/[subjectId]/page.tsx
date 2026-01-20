import { Suspense } from 'react';
import SubjectHeader from '@/components/subject/SubjectHeader';
import SubjectBreadcrumb from '@/components/subject/SubjectBreadcrumb';
import SemesterList from '@/components/subject/SemesterList';

interface PageProps {
  params: Promise<{
    countryCode: string;
    classId: string;
    subjectId: string;
  }>;
}

export default async function SubjectSemestersPage({ params }: PageProps) {
  const { countryCode, classId, subjectId } = await params;
  
  // Placeholder subject name (can be enhanced if API supports it)
  const subjectName = 'المادة الدراسية';

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Page Header */}
      <SubjectHeader subjectName={subjectName} />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 mt-8">
        <Suspense fallback={<div className="h-14 bg-white rounded-lg animate-pulse" />}>
          <SubjectBreadcrumb 
            countryCode={countryCode} 
            classId={classId} 
            subjectName={subjectName} 
          />
        </Suspense>
      </div>

      {/* Main Content - Semesters List */}
      <div className="container mx-auto px-4 mt-8">
        <Suspense fallback={
          <div className="space-y-4">
            <div className="h-64 bg-white rounded-xl animate-pulse" />
            <div className="h-64 bg-white rounded-xl animate-pulse" />
          </div>
        }>
          <SemesterList 
            countryCode={countryCode} 
            classId={classId} 
            subjectId={subjectId}
            subjectName={subjectName}
          />
        </Suspense>
      </div>
    </div>
  );
}
