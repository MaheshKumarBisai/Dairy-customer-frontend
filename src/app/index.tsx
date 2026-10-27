import { Redirect } from 'expo-router';
import { customerSession } from '../bootstrap';

export default function CustomerIndexRoute() {
  if (customerSession.isAuthenticated()) {
    return <Redirect href="/home" />;
  }
  return <Redirect href="/login" />;
}

