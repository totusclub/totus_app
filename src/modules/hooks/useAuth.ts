import {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../store';


const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {accessToken,loading, error} = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (accessToken) {
      // dispatch(fetchCustomer());
    }
  }, [accessToken, dispatch]);
  return {
    accessToken,
    loading,
    error,
  };
};

export default useAuth;
