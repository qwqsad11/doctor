import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = useSelector;

export const useAuth = () => {
  const auth = useAppSelector((state: RootState) => state.auth);
  const user = useAppSelector((state: RootState) => state.user);
  const dispatch = useAppDispatch();

  return {
    ...auth,
    user,
    dispatch,
  };
};
