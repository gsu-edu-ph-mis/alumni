const post = (url, body, cb, fin) => {
    fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).then(async function (response) {
        if (response.ok) {
            return response.json();
        }
        throw new Error(await response.text())

    }).then(function (responseJson) {
        cb(responseJson)
    }).catch(async function (error) {
        console.error(error)
        alert(error);
    }).then(function () {
        fin()
    });
}
const postAsync = async (url, body) => {
    try {
        let response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        if (!response.ok) {
            throw new Error(await response.text())
        }
        return response.json();
    } catch (error) {
        console.error(error)
        throw error
    }
}
const patch = (url, body, cb, fin) => {
    fetch(url, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).then(async function (response) {
        if (response.ok) {
            return response.json();
        }
        throw new Error(await response.text())

    }).then(function (responseJson) {
        cb(responseJson)
    }).catch(async function (error) {
        console.error(error)
        alert(error);
    }).then(function () {
        fin()
    });
}
const patchAsync = async (url, body) => {
    try {
        let response = await fetch(url, {
            method: 'PATCH',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        if (!response.ok) {
            throw new Error(await response.text())
        }
        return response.json();
    } catch (error) {
        console.error(error)
        throw error
    }
}
const put = (url, body, cb, fin) => {
    fetch(url, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).then(async function (response) {
        if (response.ok) {
            return response.json();
        }
        throw new Error(await response.text())

    }).then(function (responseJson) {
        cb(responseJson)
    }).catch(async function (error) {
        console.error(error)
        alert(error);
    }).then(function () {
        fin()
    });
}
const putAsync = async (url, body) => {
    try {
        let response = await fetch(url, {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        if (!response.ok) {
            throw new Error(await response.text())
        }
        return response.json();
    } catch (error) {
        console.error(error)
        throw error
    }
}
const del = (url, body, cb, fin) => {
    fetch(url, {
        method: 'DELETE',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).then(async function (response) {
        if (response.ok) {
            return response.json();
        }
        throw new Error(await response.text())

    }).then(function (responseJson) {
        cb(responseJson)
    }).catch(async function (error) {
        console.error(error)
        alert(error);
    }).then(function () {
        fin()
    });
}
const delAsync = async (url, body) => {
    try {
        let response = await fetch(url, {
            method: 'DELETE',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        if (!response.ok) {
            throw new Error(await response.text())
        }
        return response.json();
    } catch (error) {
        console.error(error)
        throw error
    }
}
const get = (url, cb, fin) => {
    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).then(async function (response) {
        if (response.ok) {
            return response.json();
        }
        throw new Error(await response.text())

    }).then(function (responseJson) {
        cb(responseJson)
    }).catch(async function (error) {
        console.error(error)
    }).then(function () {
        fin()
    });
}
const getAsync = async (url,) => {
    try {
        let response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        if (!response.ok) {
            throw new Error(await response.text())
        }
        return response.json();
    } catch (error) {
        console.error(error)
        throw error
    }
}