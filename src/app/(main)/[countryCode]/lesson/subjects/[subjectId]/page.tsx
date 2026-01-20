import { Suspense } from 'react';
import SubjectHeader from '@/components/subject/SubjectHeader';
import SubjectBreadcrumb from '@/components/subject/SubjectBreadcrumb';
import SemesterList from '@/components/subject/SemesterList';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

interface PageProps {
  params: Promise<{
    countryCode: string;
    subjectId: string;
  }>;
  searchParams: Promise<{
    id?: string;
  }>;
}

// Use ISR with revalidation
export const revalidate = 300;

async function getSubjectInfo(countryCode: string, subjectId: string) {
  try {
     const response = await apiClient.get<any>(
      API_ENDPOINTS.FILTER.SEMESTERS_BY_SUBJECT(subjectId),
      { database: countryCode },
      { next: { revalidate: 300 } } as any
    );

    const data = response.data.data || response.data;
    const subject = data.subject || {};
    // Check various possible locations for subject name based on API response structure
    const subjectName = subject.name || subject.subject_name || data.subject_name || 'المادة الدراسية';

    // Use class_id from API response (this is school_classes.id)
    const classId = data.class_id || subject.class_id || subject.grade_level || null;

    return { subjectName, classId };
  } catch (error) {
    console.error('Error fetching subject info:', error);
    return { subjectName: 'المادة الدراسية', classId: null };
  }
}

export default async function SubjectSemestersPage({ params, searchParams }: PageProps) {
  const { countryCode, subjectId } = await params;
  const { id: queryClassId } = await searchParams;

  const { subjectName, classId: fetchedClassId } = await getSubjectInfo(countryCode, subjectId);

  // Use query param classId if available, otherwise use fetched classId from API
  const classId = queryClassId || (fetchedClassId ? String(fetchedClassId) : null);

  if (!classId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-2">عذراً</h2>
          <p className="text-gray-600">رقم الصف الدراسي مفقود</p>
        </div>
      </div>
    );
  }

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
            subjectId={subjectId}
            subjectName={subjectName}
          />
        </Suspense>
      </div>
    </div>
  );
}
