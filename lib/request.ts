
export type ApiErrorDetail = {
    path : string;
    message : string;
}

export type ApiErrorResponse = {
    error : {
        code : string;
        message : string;
        details ? :ApiErrorDetail[]
    }
}

export type RequestError = {
    code : string;
    message : string;
    details? : ApiErrorDetail[],
    status : number
}
type RequestOptions<TBody> = Omit<RequestInit, 'body'> & {
    body ? : TBody
}

async function request<TResponse, TBody = unknown>(url : string, options : RequestOptions<TBody>) {
    const { body, headers, ...rest} = options;

    const response = await fetch(url, {
        ...rest,
        method : rest.method ? rest.method : 'GET',
        headers : {
            'Content-Type' : 'application/json',
            ...headers
        },
        body : body === undefined ? undefined : JSON.stringify(body)
    })

    const data = await response.json().catch(() => null)

    if ( !response.ok) {
        const apiError = data as ApiErrorResponse | null;

        throw {
            code : apiError?.error.code ?? 'UNKNOWN_ERROR',
            message : apiError?.error.message ?? "알 수 없는 에러가 발생했습니다",
            details : apiError?.error.details,
            status : response.status
        } satisfies RequestError;
    }

    return data as TResponse
}


export const client = {
    get : <TResponse>(url : string, init : Omit<RequestInit, 'method'>) => request<TResponse>(url, {...init, method : 'GET'}),
    post :<TResponse, TBody = unknown>(url : string,  body ?: TBody, init ? : Omit<RequestInit, 'method' | 'body'>) => (
        request<TResponse, TBody>(url, {...init, method : 'POST', body})
    )
}