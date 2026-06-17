"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from "react";

interface QandaUserContextType {
  userId: string | null;
  isQandaUser: boolean;
}

const QandaUserContext = createContext<QandaUserContextType>({
  userId: null,
  isQandaUser: false,
});

export function QandaUserProvider({
  children,
  userId: userIdProp,
}: {
  children: ReactNode;
  userId: string | null;
}) {
  const [savedUserId, setSavedUserId] = useState<string | null>(null);
  const userId = userIdProp ?? savedUserId;

  useEffect(() => {
    if (userIdProp) sessionStorage.setItem("userId", userIdProp);
  }, [userIdProp]);

  useEffect(() => {
    if (!userIdProp) setSavedUserId(sessionStorage.getItem("userId"));
  }, [userIdProp]);

  return (
    <QandaUserContext.Provider value={{ userId, isQandaUser: !!userId }}>
      {children}
    </QandaUserContext.Provider>
  );
}

export function useQandaUser() {
  return useContext(QandaUserContext);
}
