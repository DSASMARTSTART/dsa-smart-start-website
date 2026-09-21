import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLiveLibrary } from './useLiveLibrary';
import LiveAssetUpload from './LiveAssetUpload';
import LiveAssetList from './LiveAssetList';

export default function LiveMaterials({
  manager = false,
  courseId,
}: {
  manager?: boolean;
  courseId?: string;
}) {
  const { t } = useTranslation('dashboard');
  const { courses, assets, loading, error, refresh } = useLiveLibrary(courseId);
  const [chosen, setChosen] = useState('');
  const selected = courses.find((c) => c.id === (courseId || chosen)) || courses[0];
  if (!manager && !loading && !error && !selected?.canReadMaterials) return null;
  return (
    <section className="mb-8 rounded-3xl border border-white/10 bg-[#101014] p-6 text-white">
      <div className="flex items-center gap-3">
        <BookOpen className="text-purple-300" size={23} />
        <h2 className="text-xl font-bold">{t('live.packageMaterials')}</h2>
      </div>
      <p className="text-sm text-gray-400 mt-2">
        {t(manager ? 'live.materialAdminHelp' : 'live.materialStudentHelp')}
      </p>
      {loading && (
        <p role="status" className="mt-4 text-gray-400">
          {t('live.loading')}
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-300 mt-4">
          {error}{' '}
          <button className="underline" onClick={() => void refresh()}>
            {t('live.retry')}
          </button>
        </p>
      )}
      {manager && courses.length > 0 && (
        <label className="grid gap-2 mt-5 text-sm">
          {t('live.materialPackage')}
          <select
            className="rounded-xl border border-white/15 bg-[#17171d] p-3"
            value={selected?.id || ''}
            onChange={(e) => setChosen(e.target.value)}
          >
            {courses.map((course) => (
              <option value={course.id} key={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {selected && (
        <>
          {manager && (
            <p className="text-sm text-purple-200 mt-3">
              {t(
                selected.materialsIncluded
                  ? 'live.materialsIncluded'
                  : selected.materialsOffered
                    ? 'live.materialsAddon'
                    : 'live.materialsNotIncluded'
              )}
            </p>
          )}
          <LiveAssetList
            assets={assets.filter(
              (asset) => asset.kind === 'material' && asset.course_id === selected.id
            )}
            manager={manager}
            onChanged={refresh}
          />
          {!loading &&
            !error &&
            !assets.some(
              (asset) => asset.kind === 'material' && asset.course_id === selected.id
            ) && <p className="text-sm text-gray-500 mt-5">{t('live.noMaterialsYet')}</p>}
          {manager && (selected.materialsIncluded || selected.materialsOffered) && (
            <LiveAssetUpload
              key={selected.id}
              target={{ kind: 'material', courseId: selected.id }}
              onDone={refresh}
            />
          )}
        </>
      )}
      {!loading && !error && !selected && (
        <p className="text-sm text-gray-400 mt-5">{t('live.noLivePackages')}</p>
      )}
    </section>
  );
}
