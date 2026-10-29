from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.user import User
from ....services.operations import ToolName, ToolResult, TOOL_NAMES, argument_model, dispatch
from ...deps import get_current_user

router = APIRouter()

@router.get('/tools')
async def list_tools(user: User = Depends(get_current_user)):
    return {'transport': 'Authenticated HTTP gateway sharing MCP tool services', 'tools': [
        {'name': name, 'input_schema': argument_model(name).model_json_schema()} for name in TOOL_NAMES]}

@router.post('/tools/{name}', response_model=ToolResult)
async def call_tool(name: ToolName, arguments: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        return await dispatch(name, arguments, user, db)
    except ValidationError as exc:
        raise HTTPException(422, exc.errors(include_context=False)) from None
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
