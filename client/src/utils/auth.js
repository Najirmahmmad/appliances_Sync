
export const getToken = () => localStorage.getItem('token');

export const getUserID = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user?.id || '';
    } catch (e) {
        return '';
    }
};

export const getUserName = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user?.name || 'Unknown';
    } catch (e) {
        return 'Unknown';
    }
};

export const getUserRole = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user?.role || '';
    } catch (e) {
        return '';
    }
};
